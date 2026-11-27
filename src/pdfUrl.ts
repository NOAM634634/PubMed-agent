export function normalizePdfUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const pmcArticleMatch = url.pathname.match(/^\/(?:pmc\/)?articles\/(PMC)?(\d+)\/?$/i);
  const isPmcHost = url.hostname === 'pmc.ncbi.nlm.nih.gov' || url.hostname === 'www.ncbi.nlm.nih.gov';

  if (isPmcHost && pmcArticleMatch) {
    return `https://pmc.ncbi.nlm.nih.gov/articles/PMC${pmcArticleMatch[2]}/pdf/`;
  }

  if (url.hostname === 'europepmc.org' && /\/articles\/PMC\d+$/i.test(url.pathname)) {
    url.searchParams.set('pdf', 'render');
    return url.toString();
  }

  return rawUrl;
}
