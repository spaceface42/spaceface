import type { Logger } from "./logger.js";

export interface RouteSwapContext {
  url: URL;
  nextDocument: Document;
  container: Element;
  nextContainer: Element;
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

export class RouteCoordinator {
  private readonly containerSelector: string;
  private readonly logger: Logger;
  private readonly hooks: RouteCoordinatorHooks;
  private readonly cacheSize: number;
  private pageCache = new Map<string, { title: string; html: string }>();
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
    if (
      url.pathname === current.pathname &&
      url.search === current.search &&
      url.hash === current.hash &&
      !options.fromPopState
    ) {
      return;
    }

    const token = ++this.navToken;
    this.currentAbort?.abort();
    const controller = new AbortController();
    this.currentAbort = controller;

    try {
      const cacheKey = url.toString();
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
          window.location.href = url.toString();
          return;
        }

        const nextDocument = document.implementation.createHTMLDocument("");
        const nextContainer = nextDocument.createElement("div");
        nextContainer.innerHTML = cached.html;
        const swapContext: RouteSwapContext = { url, nextDocument, container, nextContainer };
        await this.hooks.onBeforeSwap?.(swapContext);
        if (token !== this.navToken) return;
        this.applyNavigationFromSwapContext(url, swapContext, cached.title, cached.html, options);
        await this.hooks.onAfterSwap?.(swapContext);
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
        window.location.href = url.toString();
        return;
      }

      const swapContext: RouteSwapContext = { url, nextDocument, container, nextContainer };
      await this.hooks.onBeforeSwap?.(swapContext);
      if (token !== this.navToken) return;

      const title = nextDocument.title || document.title;
      const nextHtml = nextContainer.innerHTML;
      this.setCache(url.toString(), { title, html: nextHtml });
      this.applyNavigationFromSwapContext(url, swapContext, title, nextHtml, options);

      await this.hooks.onAfterSwap?.(swapContext);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      this.logger.error("route navigation failed", { error, url: url.toString() });
      this.hooks.onError?.(error, url);
      window.location.href = url.toString();
    } finally {
      if (this.currentAbort === controller) {
        this.currentAbort = undefined;
      }
    }
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

    event.preventDefault();
    void this.navigate(url.toString());
  };

  private readonly onPopState = (): void => {
    void this.navigate(window.location.href, { fromPopState: true, replace: true });
  };

  private cacheCurrentPage(): void {
    const container = document.querySelector(this.containerSelector);
    if (!container) return;
    this.setCache(window.location.href, { title: document.title, html: container.innerHTML });
  }

  private setCache(url: string, entry: { title: string; html: string }): void {
    this.pageCache.delete(url);
    this.pageCache.set(url, entry);
    while (this.pageCache.size > this.cacheSize) {
      const oldest = this.pageCache.keys().next().value as string | undefined;
      if (!oldest) break;
      this.pageCache.delete(oldest);
    }
  }

  private applyNavigationFromSwapContext(
    url: URL,
    context: RouteSwapContext,
    title: string,
    html: string,
    options: { replace?: boolean; fromPopState?: boolean }
  ): void {
    context.container.innerHTML = html;
    document.title = title;
    if (!options.fromPopState) {
      if (options.replace) {
        window.history.replaceState(null, "", url.toString());
      } else {
        window.history.pushState(null, "", url.toString());
      }
    }
  }
}
