// src/spaceface/system/bin/PartialLoader.ts
export const VERSION = 'nextworld-1.3.0' as const;

import { debounce } from "../features/bin/timing.js";
import { eventBus } from "./EventBus.js";

import {
    PartialLoaderOptionsInterface,
    PartialLoadResultInterface,
    PartialInfoInterface,
    PartialEventPayload
} from "../types/bin.js";

export class PartialLoader {
    private cache = new Map<string, string>();
    private loadingPromises = new Map<string, Promise<string>>();
    private loadedPartials = new Map<string, boolean>();
    private options: Required<PartialLoaderOptionsInterface>;

    constructor(options: PartialLoaderOptionsInterface = {}) {
        this.options = {
            debug: false,
            baseUrl: "/",
            cacheEnabled: true,
            timeout: 10000,
            retryAttempts: 3,
            ...options,
        };
    }

    /** Emit debug events instead of console.debug */
    private logDebug(msg: string, data?: unknown) {
        if (this.options.debug) {
            const logKey = `${msg}-${JSON.stringify(data)}`;
            if (!this.loadedPartials.has(logKey)) {
                this.loadedPartials.set(logKey, true);
                const payload = { scope: "PartialLoader", level: "debug", message: msg, data, time: Date.now() };
                eventBus.emit("log:debug", payload);
                eventBus.emit("log", payload);
            }
        }
    }

    /** Load partials from links or info objects */
    async load(
        input: HTMLLinkElement | PartialInfoInterface | (HTMLLinkElement | PartialInfoInterface)[]
    ): Promise<PartialLoadResultInterface[]> {
        const items = Array.isArray(input) ? input : [input];
        const results: PartialLoadResultInterface[] = [];

        for (const item of items) {
            try {
                if (item instanceof HTMLLinkElement) {
                    results.push(await this.loadLink(item));
                } else {
                    results.push(await this.loadInfo(item));
                }
            } catch (error) {
                const url = item instanceof HTMLLinkElement
                    ? item.getAttribute("src") || ""
                    : item.url;
                this.logDebug("Failed to load partial", { url, error });
                results.push({ success: false, url, cached: false });
            }
        }

        eventBus.emit<PartialEventPayload>("partials:allLoaded", { url: "", cached: false });
        this.logDebug("All partials loaded", { count: results.length });
        return results;
    }

    private loadLink(link: HTMLLinkElement) {
        const src = link.getAttribute("src");
        if (!src) throw new Error("Partial link missing src");
        return this.loadUrl(this.resolveUrl(src), link);
    }

    private loadInfo(info: PartialInfoInterface) {
        return this.loadUrl(this.resolveUrl(info.url), info.container, info.id);
    }

    private async loadUrl(url: string, container: Element | ParentNode, id?: string): Promise<PartialLoadResultInterface> {
        try {
            if (this.options.cacheEnabled && this.cache.has(url)) {
                this.insertHTML(container, this.cache.get(url)!);
                this.loadedPartials.set(id || url, true);

                eventBus.emit<PartialEventPayload>("partial:loaded", { url, html: this.cache.get(url)!, cached: true });
                this.logDebug("Partial loaded from cache", { url, id });
                return { success: true, url, cached: true };
            }

            let fetchPromise = this.loadingPromises.get(url);
            if (!fetchPromise) {
                fetchPromise = this.fetchWithRetry(url);
                this.loadingPromises.set(url, fetchPromise);
            }

            const html = await fetchPromise;
            if (this.options.cacheEnabled) this.cache.set(url, html);

            this.insertHTML(container, html);
            this.loadedPartials.set(id || url, true);

            eventBus.emit<PartialEventPayload>("partial:loaded", { url, html, cached: false });
            this.logDebug("Partial loaded", { url, id });
            return { success: true, url, cached: false };
        } catch (error) {
            this.showError(container, error as Error);
            eventBus.emit<PartialEventPayload>("partial:error", { url, error });
            this.logDebug("Partial load failed", { url, id, error });
            throw error;
        } finally {
            this.loadingPromises.delete(url);
            eventBus.emit<PartialEventPayload>("partial:load:complete", { url });
            this.logDebug("Partial load complete", { url, id });
        }
    }

    private async fetchWithRetry(url: string, attempt = 1): Promise<string> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        try {
            const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = (await res.text()).trim();
            if (!html) throw new Error("Empty response");
            return html;
        } catch (err) {
            if (attempt < this.options.retryAttempts) {
                this.logDebug("Retrying fetch", { url, attempt });
                await this.delay(Math.min(2 ** attempt * 100, 5000));
                return this.fetchWithRetry(url, attempt + 1);
            }
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private async fetchPartial(url: string, attempt = 1): Promise<string> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        try {
            const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const html = (await res.text()).trim();
            if (!html) throw new Error("Empty response");
            return html;
        } catch (err) {
            if (attempt < this.options.retryAttempts) {
                this.logDebug("Retrying fetch", { url, attempt });
                await this.delay(Math.min(2 ** attempt * 100, 5000));
                return this.fetchPartial(url, attempt + 1);
            }
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private insertHTML(container: ParentNode | Element, html: string) {
        const template = document.createElement("template");
        template.innerHTML = html;

        if (container instanceof HTMLLinkElement) {
            container.replaceWith(...template.content.childNodes);
        } else if (container instanceof Element) {
            container.innerHTML = "";
            container.append(...template.content.childNodes);
        } else {
            container.append(...template.content.childNodes);
        }

        this.logDebug("Inserted HTML into container", { container });
    }

    private showError(container: ParentNode | Element, error: Error) {
        const div = document.createElement("div");
        div.className = "partial-error";
        div.textContent = "Partial load failed";
        if (this.options.debug) div.textContent += `: ${error.message}`;

        if (container instanceof HTMLLinkElement) {
            container.replaceWith(div);
        } else if (container instanceof Element) {
            container.innerHTML = "";
            container.appendChild(div);
        } else {
            container.appendChild(div);
        }

        eventBus.emit("log:error", {
            scope: "PartialLoader",
            message: "Partial load failed",
            error,
            context: {
                url: container instanceof HTMLLinkElement ? container.href : undefined,
                retryAttempts: this.options.retryAttempts,
            },
        });
        this.logDebug("Error displayed in container", { container, error });
    }

    isPartialLoaded(id: string) {
        return this.loadedPartials.has(id);
    }

    private resolveUrl(src: string): string {
        if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(src) || src.startsWith("//")) {
            this.logDebug("URL is already absolute", { src });
            return src;
        }

        try {
            const base = this.options.baseUrl || window.location.origin + "/";
            const url = new URL(src, base).toString();
            const resolvedUrl = url.startsWith(window.location.origin)
                ? url.slice(window.location.origin.length) || "/"
                : url;
            this.logDebug("Resolved relative URL", { src, resolvedUrl });
            return resolvedUrl;
        } catch (error) {
            this.logDebug("Failed to resolve URL", { src, error });
            return src;
        }
    }

    private delay(ms: number): Promise<void> {
        this.logDebug("Delaying execution", { ms });
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async loadContainer(container: ParentNode = document): Promise<PartialLoadResultInterface[]> {
        const links = container.querySelectorAll<HTMLLinkElement>('link[rel="partial"][src]');
        if (!links.length) return [];
        return this.load(Array.from(links));
    }

    watch(container: HTMLElement | Document = document.body) {
        if (!window.MutationObserver) return;
        const observer = new MutationObserver(
            debounce(() => this.loadContainer(container), 100)
        );
        observer.observe(container, { childList: true, subtree: true });
        this.logDebug("Watching container for partials", { container });
        return observer;
    }

    /** Exposed method so PartialFetcher can reuse loader's cache + retry */
    async fetchWithLoaderCache(url: string): Promise<string> {
        if (this.options.cacheEnabled && this.cache.has(url)) {
            this.logDebug("Fetching from cache", { url });
            return this.cache.get(url)!;
        }
        const html = await this.fetchPartial(url);
        if (this.options.cacheEnabled) this.cache.set(url, html);
        this.logDebug("Fetched and cached partial", { url });
        return html;
    }
}
