const partialCache = new Map<string, string>();
const MAX_PARTIAL_CACHE_SIZE = 10;

export interface LoadPartialOptions {
  cache?: boolean;
  signal?: AbortSignal;
}

export async function loadPartialHtml(url: string, options: LoadPartialOptions = {}): Promise<string> {
  const resolvedUrl = new URL(url, window.location.href).toString();
  const useCache = options.cache ?? true;

  if (useCache && partialCache.has(resolvedUrl)) {
    // Refresh LRU order by delete/set
    const html = partialCache.get(resolvedUrl)!;
    partialCache.delete(resolvedUrl);
    partialCache.set(resolvedUrl, html);
    return html;
  }

  const response = await fetch(resolvedUrl, {
    method: "GET",
    headers: { Accept: "text/html" },
    credentials: "same-origin",
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`Partial fetch failed: HTTP ${response.status} (${resolvedUrl})`);
  }

  const html = await response.text();
  if (useCache) {
    partialCache.set(resolvedUrl, html);
    if (partialCache.size > MAX_PARTIAL_CACHE_SIZE) {
      const oldest = partialCache.keys().next().value as string | undefined;
      if (oldest) partialCache.delete(oldest);
    }
  }
  return html;
}
