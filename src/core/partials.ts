const partialCache = new Map<string, string>();

export interface LoadPartialOptions {
  cache?: boolean;
  signal?: AbortSignal;
}

export async function loadPartialHtml(url: string, options: LoadPartialOptions = {}): Promise<string> {
  const resolvedUrl = new URL(url, window.location.href).toString();
  const useCache = options.cache ?? true;

  if (useCache && partialCache.has(resolvedUrl)) {
    return partialCache.get(resolvedUrl) ?? "";
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
  }
  return html;
}
