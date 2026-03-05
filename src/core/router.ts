import type { Logger } from "./logger.js";

export interface RouteSwapContext {
  url: URL;
  nextDocument: Document;
  container: Element;
  nextContainer: Element;
  isCurrentNavigation: () => boolean;
}

export interface RouteCoordinatorHooks {
  onBeforeSwap?: (context: RouteSwapContext) => Promise<void> | void;
  onAfterSwap?: (context: RouteSwapContext) => Promise<void> | void;
  onError?: (error: unknown, url: URL) => void;
}

export interface RouteCoordinatorOptions {
  containerSelector: string;
  logger: Logger;
  hooks?: RouteCoordinatorHooks;
  cacheSize?: number;
}

interface CachedPageEntry {
  title: string;
  html: string;
  htmlAttrs: {
    lang: string;
    dir: string | null;
    dataMode: string | null;
  };
  bodyAttrs: {
    className: string;
    dataPage: string | null;
  };
}

export class RouteCoordinator {
  private readonly containerSelector: string;
  private readonly logger: Logger;
  private readonly hooks: RouteCoordinatorHooks;
  private readonly cacheSize: number;
  private pageCache = new Map<string, CachedPageEntry>();
  private cacheHits = 0;
  private cacheMisses = 0;
  private currentAbort?: AbortController;
  private navToken = 0;
  private started = false;

  constructor(options: RouteCoordinatorOptions) {
    this.containerSelector = options.containerSelector;
    this.logger = options.logger;
    this.hooks = options.hooks ?? {};
    this.cacheSize = Math.max(1, options.cacheSize ?? 16);
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.cacheCurrentPage();
    document.addEventListener("click", this.onDocumentClick);
    window.addEventListener("popstate", this.onPopState);
  }

  destroy(): void {
    if (!this.started) return;
    this.started = false;
    document.removeEventListener("click", this.onDocumentClick);
    window.removeEventListener("popstate", this.onPopState);
    this.currentAbort?.abort();
    this.currentAbort = undefined;
  }

  async navigate(input: string | URL, options: { replace?: boolean; fromPopState?: boolean } = {}): Promise<void> {
    const url = new URL(input.toString(), window.location.href);
    const current = new URL(window.location.href);

    if (url.origin !== window.location.origin) {
      window.location.href = url.toString();
      return;
    }
    const sameDocument = url.pathname === current.pathname && url.search === current.search;
    if (sameDocument && url.hash !== current.hash) {
      if (!options.fromPopState) {
        if (options.replace) {
          window.history.replaceState(null, "", url.toString());
        } else {
          window.location.hash = url.hash;
        }
      }
      return;
    }
    if (sameDocument && url.hash === current.hash && !options.fromPopState) return;

    const token = ++this.navToken;
    this.currentAbort?.abort();
    const controller = new AbortController();
    this.currentAbort = controller;

    try {
      const cacheKey = this.toCacheKey(url);
      const cached = this.pageCache.get(cacheKey);
      if (cached) {
        this.cacheHits += 1;
        this.logger.debug("route cache hit", {
          url: cacheKey,
          hits: this.cacheHits,
          misses: this.cacheMisses,
          entries: this.pageCache.size,
        });
        if (token !== this.navToken) return;
        const container = document.querySelector(this.containerSelector);
        if (!container) {
          this.fallbackToDocumentNavigation(url, options);
          return;
        }

        const nextDocument = document.implementation.createHTMLDocument("");
        nextDocument.title = cached.title;
        nextDocument.documentElement.lang = cached.htmlAttrs.lang;
        setNullableAttribute(nextDocument.documentElement, "dir", cached.htmlAttrs.dir);
        setNullableAttribute(nextDocument.documentElement, "data-mode", cached.htmlAttrs.dataMode);
        nextDocument.body.className = cached.bodyAttrs.className;
        setNullableAttribute(nextDocument.body, "data-page", cached.bodyAttrs.dataPage);

        // Mirror network-path hook context: provide a real nextDocument/body tree
        // with a container element matching the current container shape.
        const nextContainer = container.cloneNode(false) as Element;
        nextContainer.innerHTML = cached.html;
        nextDocument.body.appendChild(nextContainer);
        const swapContext: RouteSwapContext = {
          url,
          nextDocument,
          container,
          nextContainer,
          isCurrentNavigation: () => token === this.navToken,
        };
        await this.hooks.onBeforeSwap?.(swapContext);
        if (token !== this.navToken) return;
        this.applyNavigationFromSwapContext(url, swapContext, cached, options);
        if (token !== this.navToken) return;
        await this.hooks.onAfterSwap?.(swapContext);
        if (token !== this.navToken) return;
        return;
      }
      this.cacheMisses += 1;
      this.logger.debug("route cache miss", {
        url: cacheKey,
        hits: this.cacheHits,
        misses: this.cacheMisses,
        entries: this.pageCache.size,
      });

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: "text/html" },
      });

      if (!response.ok) {
        throw new Error(`Route fetch failed: HTTP ${response.status}`);
      }

      const html = await response.text();
      if (token !== this.navToken) return;

      const parser = new DOMParser();
      const nextDocument = parser.parseFromString(html, "text/html");

      const container = document.querySelector(this.containerSelector);
      const nextContainer = nextDocument.querySelector(this.containerSelector);
      if (!container || !nextContainer) {
        this.fallbackToDocumentNavigation(url, options);
        return;
      }

      const swapContext: RouteSwapContext = {
        url,
        nextDocument,
        container,
        nextContainer,
        isCurrentNavigation: () => token === this.navToken,
      };
      await this.hooks.onBeforeSwap?.(swapContext);
      if (token !== this.navToken) return;

      const entry = this.createCacheEntry(nextDocument, nextContainer);
      this.setCache(cacheKey, entry);
      this.applyNavigationFromSwapContext(url, swapContext, entry, options);
      if (token !== this.navToken) return;

      await this.hooks.onAfterSwap?.(swapContext);
      if (token !== this.navToken) return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      this.logger.error("route navigation failed", { error, url: url.toString() });
      this.hooks.onError?.(error, url);
      this.fallbackToDocumentNavigation(url, options);
    } finally {
      if (this.currentAbort === controller) {
        this.currentAbort = undefined;
      }
    }
  }

  private fallbackToDocumentNavigation(url: URL, options: { replace?: boolean; fromPopState?: boolean }): void {
    // During browser back/forward, avoid writing a new history entry, otherwise forward chain can be lost.
    if (options.fromPopState) {
      window.location.replace(url.toString());
      return;
    }
    window.location.href = url.toString();
  }

  private readonly onDocumentClick = (event: MouseEvent): void => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target as Element | null;
    const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.dataset.router === "off") return;
    if (anchor.hasAttribute("download")) return;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash !== window.location.hash) {
      return;
    }

    event.preventDefault();
    void this.navigate(url.toString());
  };

  private readonly onPopState = (): void => {
    void this.navigate(window.location.href, { fromPopState: true, replace: true });
  };

  private cacheCurrentPage(): void {
    const container = document.querySelector(this.containerSelector);
    if (!container) return;
    this.setCache(this.toCacheKey(window.location.href), {
      title: document.title,
      html: container.innerHTML,
      htmlAttrs: {
        lang: document.documentElement.lang,
        dir: document.documentElement.getAttribute("dir"),
        dataMode: document.documentElement.getAttribute("data-mode"),
      },
      bodyAttrs: {
        className: document.body.className,
        dataPage: document.body.getAttribute("data-page"),
      },
    });
  }

  private setCache(url: string, entry: CachedPageEntry): void {
    this.pageCache.delete(url);
    this.pageCache.set(url, entry);
    while (this.pageCache.size > this.cacheSize) {
      const oldest = this.pageCache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.pageCache.delete(oldest);
    }
  }

  private toCacheKey(input: string | URL): string {
    const url = new URL(input.toString(), window.location.href);
    return `${url.origin}${url.pathname}${url.search}`;
  }

  private applyNavigationFromSwapContext(
    url: URL,
    context: RouteSwapContext,
    entry: CachedPageEntry,
    options: { replace?: boolean; fromPopState?: boolean }
  ): void {
    context.container.innerHTML = entry.html;
    document.title = entry.title;
    this.applyDocumentAttributes(entry);
    if (!options.fromPopState) {
      if (options.replace) {
        window.history.replaceState(null, "", url.toString());
      } else {
        window.history.pushState(null, "", url.toString());
      }
    }
  }

  private createCacheEntry(nextDocument: Document, nextContainer: Element): CachedPageEntry {
    return {
      title: nextDocument.title || document.title,
      html: nextContainer.innerHTML,
      htmlAttrs: {
        lang: nextDocument.documentElement.lang || document.documentElement.lang,
        dir: nextDocument.documentElement.getAttribute("dir"),
        dataMode: nextDocument.documentElement.getAttribute("data-mode"),
      },
      bodyAttrs: {
        className: nextDocument.body?.className ?? "",
        dataPage: nextDocument.body?.getAttribute("data-page") ?? null,
      },
    };
  }

  private applyDocumentAttributes(entry: CachedPageEntry): void {
    document.documentElement.lang = entry.htmlAttrs.lang;
    setNullableAttribute(document.documentElement, "dir", entry.htmlAttrs.dir);
    setNullableAttribute(document.documentElement, "data-mode", entry.htmlAttrs.dataMode);

    document.body.className = entry.bodyAttrs.className;
    setNullableAttribute(document.body, "data-page", entry.bodyAttrs.dataPage);
  }
}

function setNullableAttribute(element: Element, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, value);
}
