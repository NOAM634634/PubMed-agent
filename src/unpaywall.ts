import { config } from './config';
import { withRetry } from './retry';

export interface UnpaywallResult {
  isOa: boolean;
  pdfUrl: string | null;
  landingPageUrl: string | null;
}

export async function lookupUnpaywall(doi: string): Promise<UnpaywallResult> {
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(
    config.contactEmail
  )}`;

  return withRetry(
    async () => {
      const res = await fetch(url);

      if (res.status === 404) {
        return { isOa: false, pdfUrl: null, landingPageUrl: null };
      }
      if (res.status === 429) throw new Error('unpaywall rate limited (429)');
      if (!res.ok) throw new Error(`unpaywall failed with status ${res.status}`);

      const data: any = await res.json();
      return {
        isOa: Boolean(data?.is_oa),
        pdfUrl: data?.best_oa_location?.url_for_pdf ?? null,
        landingPageUrl:
          data?.best_oa_location?.url_for_landing_page ?? data?.best_oa_location?.url ?? null,
      };
    },
    { label: `unpaywall ${doi}` }
  );
}
