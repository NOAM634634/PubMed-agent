import fs from 'fs';
import { ResultRow } from './types';

const HEADERS: { key: keyof ResultRow; label: string }[] = [
  { key: 'pmid', label: 'PMID' },
  { key: 'pubmedUrl', label: 'PubMed URL' },
  { key: 'title', label: 'Title' },
  { key: 'authors', label: 'Authors' },
  { key: 'journal', label: 'Journal' },
  { key: 'year', label: 'Year' },
  { key: 'abstract', label: 'Abstract' },
  { key: 'doi', label: 'DOI' },
  { key: 'pmcid', label: 'PMCID' },
  { key: 'status', label: 'Status' },
  { key: 'pdfUrl', label: 'PDF URL' },
  { key: 'localPath', label: 'Local File Path' },
];

export function writeResultsCsv(rows: ResultRow[], filePath: string): void {
  const lines = [HEADERS.map((h) => h.label).join(',')];

  for (const row of rows) {
    lines.push(HEADERS.map((h) => escapeCsv(row[h.key])).join(','));
  }

  const BOM = '﻿';
  fs.writeFileSync(filePath, BOM + lines.join('\r\n'), { encoding: 'utf-8' });
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
