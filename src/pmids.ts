import fs from 'fs';

export function loadPmids(filePath: string): string[] {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const seen = new Set<string>();
  const pmids: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const pmid = extractPmid(trimmed);
    if (pmid && !seen.has(pmid)) {
      seen.add(pmid);
      pmids.push(pmid);
    }
  }

  return pmids;
}

function extractPmid(line: string): string | null {
  if (/^\d+$/.test(line)) return line;

  const urlMatch = line.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
  if (urlMatch) return urlMatch[1];

  const digits = line.match(/\d{4,9}/);
  return digits ? digits[0] : null;
}
