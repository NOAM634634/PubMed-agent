import { XMLParser } from 'fast-xml-parser';
import { config } from './config';
import { withRetry, sleep } from './retry';
import { PubMedArticle } from './types';

const EFETCH_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
const BATCH_SIZE = 200;
// NCBI allows ~10 req/sec with an API key, ~3 req/sec without one.
const DELAY_MS = config.ncbiApiKey ? 110 : 350;

export async function fetchArticles(
  pmids: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, PubMedArticle>> {
  const result = new Map<string, PubMedArticle>();
  const batches = chunk(pmids, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const xml = await withRetry(() => fetchBatchXml(batch), {
      label: `efetch batch ${i + 1}/${batches.length}`,
    });

    for (const article of parseEfetchXml(xml)) {
      result.set(article.pmid, article);
    }

    onProgress?.(Math.min((i + 1) * BATCH_SIZE, pmids.length), pmids.length);

    if (i < batches.length - 1) await sleep(DELAY_MS);
  }

  return result;
}

async function fetchBatchXml(pmids: string[]): Promise<string> {
  const params = new URLSearchParams({
    db: 'pubmed',
    retmode: 'xml',
    id: pmids.join(','),
  });
  if (config.ncbiApiKey) params.set('api_key', config.ncbiApiKey);
  if (config.contactEmail) params.set('email', config.contactEmail);

  const res = await fetch(`${EFETCH_URL}?${params.toString()}`);

  if (res.status === 429) throw new Error('rate limited (429)');
  if (!res.ok) throw new Error(`efetch failed with status ${res.status}`);

  return res.text();
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parseEfetchXml(xml: string): PubMedArticle[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const data = parser.parse(xml);
  const rawArticles = toArray(data?.PubmedArticleSet?.PubmedArticle);

  const articles: PubMedArticle[] = [];
  for (const raw of rawArticles) {
    const article = parseOneArticle(raw);
    if (article) articles.push(article);
  }
  return articles;
}

function parseOneArticle(raw: any): PubMedArticle | null {
  const medlineCitation = raw?.MedlineCitation;
  const pubmedData = raw?.PubmedData;
  const pmid = getText(medlineCitation?.PMID);
  if (!pmid) return null;

  const articleNode = medlineCitation?.Article;
  const title = getText(articleNode?.ArticleTitle);
  const journal =
    getText(articleNode?.Journal?.Title) || getText(articleNode?.Journal?.ISOAbbreviation);
  const year =
    getText(articleNode?.Journal?.JournalIssue?.PubDate?.Year) ||
    getText(articleNode?.Journal?.JournalIssue?.PubDate?.MedlineDate);

  const authorList = toArray(articleNode?.AuthorList?.Author);
  const authors = authorList
    .map((a: any) => {
      const collective = getText(a?.CollectiveName);
      if (collective) return collective;
      const lastName = getText(a?.LastName);
      const foreName = getText(a?.ForeName) || getText(a?.Initials);
      return [foreName, lastName].filter(Boolean).join(' ').trim();
    })
    .filter(Boolean)
    .join(', ');

  const abstractParts = toArray(articleNode?.Abstract?.AbstractText);
  const abstractText = abstractParts
    .map((part: any) => {
      const label = part?.['@_Label'];
      const text = getText(part);
      return label ? `${label}: ${text}` : text;
    })
    .filter(Boolean)
    .join(' ');

  let doi: string | null = null;
  let pmcid: string | null = null;

  const articleIdList = toArray(pubmedData?.ArticleIdList?.ArticleId);
  for (const idNode of articleIdList) {
    const idType = idNode?.['@_IdType'];
    const idValue = getText(idNode);
    if (idType === 'doi' && idValue) doi = idValue;
    if (idType === 'pmc' && idValue) pmcid = idValue;
  }

  if (!doi) {
    for (const el of toArray(articleNode?.ELocationID)) {
      if (el?.['@_EIdType'] === 'doi') {
        const val = getText(el);
        if (val) doi = val;
      }
    }
  }

  return {
    pmid,
    pubmedUrl: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    title,
    authors,
    journal,
    year,
    abstract: abstractText,
    doi,
    pmcid,
  };
}

function toArray(value: any): any[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getText(value: any): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(getText).join('');
  if (typeof value === 'object') {
    let out = '';
    for (const key of Object.keys(value)) {
      if (key.startsWith('@_')) continue;
      out += getText(value[key]);
    }
    return out;
  }
  return '';
}
