// src/spaceface/system/bin/PartialLoader.ts

export const VERSION = 'nextworld-1.0.0' as const;

import { debounce } from "../features/bin/timing.js";
import { eventBus } from "./EventBus.js";

import {
    PartialLoaderOptionsInterface,
    PartialLoadResultInterface,
    PartialInfoInterface
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

    private logDebug(msg: string, data?: unknown) {
        if (this.options.debug) console.debug(`[PartialLoader] ${msg}`, data);
    }

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
            } catch {
                const url = item instanceof HTMLLinkElement
                    ? item.getAttribute("src") || ""
                    : item.url;
                results.push({ success: false, url, cached: false });
            }
        }

        eventBus.emit("partials:allLoaded", { count: results.length });
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
            if (this.loadingPromises.has(url)) await this.loadingPromises.get(url)!;

            if (this.options.cacheEnabled && this.cache.has(url)) {
                this.insertHTML(container, this.cache.get(url)!);
                this.loadedPartials.set(id || url, true);
                eventBus.emit("partial:loaded", { url, cached: true });
                return { success: true, url, cached: true };
            }

            const promise = this.fetchPartial(url);
            this.loadingPromises.set(url, promise);

            const html = await promise;
            if (this.options.cacheEnabled) this.cache.set(url, html);

            this.insertHTML(container, html);
            this.loadedPartials.set(id || url, true);
            eventBus.emit("partial:loaded", { url, cached: false });
            return { success: true, url, cached: false };
        } catch (error) {
            this.showError(container, error as Error);
            eventBus.emit("partial:error", { url, error });
            throw error;
        } finally {
            this.loadingPromises.delete(url);
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
    }

    isPartialLoaded(id: string) {
        return this.loadedPartials.has(id);
    }

    private resolveUrl(src: string) {
        if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(src) || src.startsWith("//")) return src;

        try {
            const base = this.options.baseUrl || window.location.origin + "/";
            const url = new URL(src, base).toString();
            return url.startsWith(window.location.origin)
                ? url.slice(window.location.origin.length) || "/"
                : url;
        } catch {
            return src;
        }
    }

    private delay(ms: number) {
        return new Promise(r => setTimeout(r, ms));
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
        return observer;
    }
}
