import { withRetry } from './retry';

const API_URL = 'https://api.semanticscholar.org/graph/v1/paper/PMID:';

export interface SemanticScholarResult {
  pdfUrl: string | null;
}

export async function lookupSemanticScholar(pmid: string): Promise<SemanticScholarResult> {
  const url = `${API_URL}${pmid}?fields=openAccessPdf`;

  return withRetry(
    async () => {
      const res = await fetch(url);

      if (res.status === 404) return { pdfUrl: null };
      if (res.status === 429) throw new Error('Semantic Scholar rate limited (429)');
      if (!res.ok) throw new Error(`Semantic Scholar failed with status ${res.status}`);

      const data: any = await res.json();
      return { pdfUrl: data?.openAccessPdf?.url ?? null };
    },
    { label: `semantic scholar ${pmid}`, retries: 5, baseDelayMs: 1500 }
  );
}
