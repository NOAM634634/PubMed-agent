import fs from 'fs';
import path from 'path';
import { withRetry } from './retry';

export async function downloadPdf(url: string, destPath: string): Promise<void> {
  await withRetry(
    async () => {
      const res = await fetch(url, { redirect: 'follow' });

      if (res.status === 429) throw new Error('download rate limited (429)');
      if (!res.ok) throw new Error(`download failed with status ${res.status}`);

      const contentType = res.headers.get('content-type') || '';
      const buffer = Buffer.from(await res.arrayBuffer());
      const looksLikePdf = contentType.includes('pdf') || buffer.subarray(0, 4).toString('utf-8') === '%PDF';

      if (!looksLikePdf) {
        throw new Error('downloaded content does not look like a PDF');
      }

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, buffer);
    },
    { label: `download ${url}` }
  );
}

export function pdfExists(destPath: string): boolean {
  return fs.existsSync(destPath) && fs.statSync(destPath).size > 0;
}
