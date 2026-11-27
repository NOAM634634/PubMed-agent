import fs from 'fs';
import path from 'path';
import { config } from './config';
import { loadPmids } from './pmids';
import { fetchArticles } from './eutils';
import { lookupUnpaywall } from './unpaywall';
import { downloadPdf, pdfExists } from './download';
import { writeResultsCsv } from './csv';
import { sleep } from './retry';
import { ResultRow } from './types';

const PMIDS_FILE = path.join(process.cwd(), 'pmids.txt');
const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');
const RESULTS_FILE = path.join(process.cwd(), 'results.csv');
const UNPAYWALL_DELAY_MS = 150;

async function main() {
  console.log('PubMed Agent - starting\n');

  if (!config.contactEmail) {
    console.error('Missing CONTACT_EMAIL in .env (required by NCBI E-utilities and Unpaywall).');
    process.exit(1);
  }
  if (!config.ncbiApiKey) {
    console.warn('Warning: NCBI_API_KEY not set - requests limited to ~3/sec instead of ~10/sec.\n');
  }
  if (!fs.existsSync(PMIDS_FILE)) {
    console.error(`pmids.txt not found at ${PMIDS_FILE}`);
    process.exit(1);
  }

  const pmids = loadPmids(PMIDS_FILE);
  if (pmids.length === 0) {
    console.error('No PMIDs found in pmids.txt');
    process.exit(1);
  }
  console.log(`Loaded ${pmids.length} unique PMID(s) from pmids.txt\n`);

  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

  console.log('Fetching article metadata from PubMed...');
  const articles = await fetchArticles(pmids, (done, total) => {
    console.log(`  metadata progress: ${done}/${total}`);
  });
  console.log('');

  const rows: ResultRow[] = [];

  for (let i = 0; i < pmids.length; i++) {
    const pmid = pmids[i];
    const progress = `[${i + 1}/${pmids.length}]`;
    const article = articles.get(pmid);

    if (!article) {
      console.warn(`${progress} PMID ${pmid}: no metadata returned by PubMed, skipping`);
      rows.push({
        pmid,
        pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        title: '',
        authors: '',
        journal: '',
        year: '',
        abstract: '',
        doi: null,
        pmcid: null,
        status: 'error',
        pdfUrl: null,
        localPath: null,
      });
      continue;
    }

    console.log(`${progress} PMID ${pmid}: ${article.title.slice(0, 90)}`);

    const destPath = path.join(DOWNLOADS_DIR, `${pmid}.pdf`);
    const row: ResultRow = { ...article, status: 'paywall_or_no_pdf', pdfUrl: null, localPath: null };

    if (pdfExists(destPath)) {
      console.log('  PDF already downloaded, skipping');
      row.status = 'already_downloaded';
      row.localPath = destPath;
      rows.push(row);
      continue;
    }

    if (!article.doi) {
      console.log('  no DOI available, cannot query Unpaywall');
      row.status = 'no_doi';
      row.pdfUrl = article.pubmedUrl;
      rows.push(row);
      continue;
    }

    try {
      const unpaywall = await lookupUnpaywall(article.doi);
      await sleep(UNPAYWALL_DELAY_MS);

      if (unpaywall.isOa && unpaywall.pdfUrl) {
        console.log('  open-access PDF found, downloading...');
        try {
          await downloadPdf(unpaywall.pdfUrl, destPath);
          row.status = 'downloaded';
          row.pdfUrl = unpaywall.pdfUrl;
          row.localPath = destPath;
          console.log(`  saved to ${destPath}`);
        } catch (err) {
          console.warn(`  failed to download PDF: ${(err as Error).message}`);
          row.status = 'error';
          row.pdfUrl = unpaywall.pdfUrl;
        }
      } else {
        console.log('  no open-access PDF available');
        row.status = 'paywall_or_no_pdf';
        row.pdfUrl = unpaywall.landingPageUrl || article.pubmedUrl;
      }
    } catch (err) {
      console.warn(`  Unpaywall lookup failed: ${(err as Error).message}`);
      row.status = 'error';
      row.pdfUrl = article.pubmedUrl;
    }

    rows.push(row);
  }

  writeResultsCsv(rows, RESULTS_FILE);

  const downloaded = rows.filter(
    (r) => r.status === 'downloaded' || r.status === 'already_downloaded'
  ).length;

  console.log(`\nDone. Results saved to ${RESULTS_FILE}`);
  console.log(`Summary: ${downloaded}/${rows.length} PDFs available locally.`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
