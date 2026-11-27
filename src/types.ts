export interface PubMedArticle {
  pmid: string;
  pubmedUrl: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  doi: string | null;
  pmcid: string | null;
}

export type DownloadStatus =
  | 'downloaded'
  | 'already_downloaded'
  | 'paywall_or_no_pdf'
  | 'no_doi'
  | 'error';

export interface ResultRow extends PubMedArticle {
  status: DownloadStatus;
  pdfUrl: string | null;
  localPath: string | null;
}
