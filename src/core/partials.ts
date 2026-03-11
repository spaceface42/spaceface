import { APP_CONTRACT } from "../../sites/spaceface/app/contract.js";

const partialCache = new Map<string, string>();
const MAX_PARTIAL_CACHE_SIZE = 10;
const ASSET_ATTR_PATTERN = createAssetAttrPattern(APP_CONTRACT.partialAssetAttributes);
const STYLESHEET_HREF_PATTERN = /(<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=)(["'])([^"']+)\2/gi;

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

  const rawHtml = await response.text();
  const html = rebasePartialAssetUrls(rawHtml, resolvedUrl);
  if (useCache) {
    partialCache.set(resolvedUrl, html);
    if (partialCache.size > MAX_PARTIAL_CACHE_SIZE) {
      const oldest = partialCache.keys().next().value as string | undefined;
      if (oldest) partialCache.delete(oldest);
    }
  }
  return html;
}

function rebasePartialAssetUrls(html: string, baseUrl: string): string {
  let rebased = html.replace(ASSET_ATTR_PATTERN, (fullMatch, quote: string, value: string) => {
    const nextValue = rebaseRelativeUrl(value, baseUrl);
    return nextValue === value ? fullMatch : fullMatch.replace(value, nextValue);
  });

  rebased = rebased.replace(
    STYLESHEET_HREF_PATTERN,
    (fullMatch, prefix: string, quote: string, value: string) => {
      const nextValue = rebaseRelativeUrl(value, baseUrl);
      return nextValue === value ? fullMatch : `${prefix}${quote}${nextValue}${quote}`;
    }
  );

  return rebased;
}

function rebaseRelativeUrl(value: string, baseUrl: string): string {
  if (isExternalOrSpecialUrl(value)) {
    return value;
  }
  return new URL(value, baseUrl).toString();
}

function isExternalOrSpecialUrl(value: string): boolean {
  return value.startsWith("/") || /^(?:[a-z]+:|\/\/|#|data:)/i.test(value);
}

function createAssetAttrPattern(attributeNames: string[]): RegExp {
  const escapedNames = attributeNames.map(escapeRegExp).join("|");
  return new RegExp(`\\b(?:${escapedNames})\\s*=\\s*(["'])([^"']+)\\1`, "gi");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
