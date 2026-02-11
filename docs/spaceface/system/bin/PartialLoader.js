export const VERSION = 'nextworld-1.3.0';
import { debounce } from "../features/bin/timing.js";
import { eventBus } from "./EventBus.js";
export class PartialLoader {
    cache = new Map();
    loadingPromises = new Map();
    loadedPartials = new Map();
    options;
    constructor(options = {}) {
        this.options = {
            debug: false,
            baseUrl: "/",
            cacheEnabled: true,
            timeout: 10000,
            retryAttempts: 3,
            ...options,
        };
    }
    logDebug(msg, data) {
        if (this.options.debug) {
            const logKey = `${msg}-${JSON.stringify(data)}`;
            if (!this.loadedPartials.has(logKey)) {
                this.loadedPartials.set(logKey, true);
                const payload = {
                    scope: "PartialLoader",
                    level: "debug",
                    message: msg,
                    data,
                    time: Date.now(),
                };
                eventBus.emit("log:debug", payload);
                eventBus.emit("log", payload);
            }
        }
    }
    async load(input) {
        const items = Array.isArray(input) ? input : [input];
        const results = [];
        for (const item of items) {
            try {
                if (item instanceof HTMLLinkElement) {
                    results.push(await this.loadLink(item));
                }
                else {
                    results.push(await this.loadInfo(item));
                }
            }
            catch (error) {
                const url = item instanceof HTMLLinkElement
                    ? item.getAttribute("src") || ""
                    : item.url;
                this.logDebug("Failed to load partial", { url, error });
                results.push({ success: false, url, cached: false });
            }
        }
        eventBus.emit("partials:allLoaded", { url: "", cached: false });
        this.logDebug("All partials loaded", { count: results.length });
        return results;
    }
    loadLink(link) {
        const src = link.getAttribute("src");
        if (!src)
            throw new Error("Partial link missing src");
        return this.loadUrl(this.resolveUrl(src), link);
    }
    loadInfo(info) {
        return this.loadUrl(this.resolveUrl(info.url), info.container, info.id);
    }
    async loadUrl(url, container, id) {
        try {
            if (this.options.cacheEnabled && this.cache.has(url)) {
                this.insertHTML(container, this.cache.get(url));
                this.loadedPartials.set(id || url, true);
                eventBus.emit("partial:loaded", { url, html: this.cache.get(url), cached: true });
                this.logDebug("Partial loaded from cache", { url, id });
                return { success: true, url, cached: true };
            }
            let fetchPromise = this.loadingPromises.get(url);
            if (!fetchPromise) {
                fetchPromise = this.fetchWithRetry(url);
                this.loadingPromises.set(url, fetchPromise);
            }
            const html = await fetchPromise;
            if (this.options.cacheEnabled)
                this.cache.set(url, html);
            this.insertHTML(container, html);
            this.loadedPartials.set(id || url, true);
            eventBus.emit("partial:loaded", { url, html, cached: false });
            this.logDebug("Partial loaded", { url, id });
            return { success: true, url, cached: false };
        }
        catch (error) {
            this.showError(container, error);
            eventBus.emit("partial:error", { url, error });
            this.logDebug("Partial load failed", { url, id, error });
            throw error;
        }
        finally {
            this.loadingPromises.delete(url);
            eventBus.emit("partial:load:complete", { url });
            this.logDebug("Partial load complete", { url, id });
        }
    }
    async fetchWithRetry(url, attempt = 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
        try {
            const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const html = (await res.text()).trim();
            if (!html)
                throw new Error("Empty response");
            return html;
        }
        catch (err) {
            if (attempt < this.options.retryAttempts) {
                this.logDebug("Retrying fetch", { url, attempt });
                await this.delay(Math.min(2 ** attempt * 100, 5000));
                return this.fetchWithRetry(url, attempt + 1);
            }
            throw err;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    async fetchPartial(url, attempt = 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
        try {
            const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const html = (await res.text()).trim();
            if (!html)
                throw new Error("Empty response");
            return html;
        }
        catch (err) {
            if (attempt < this.options.retryAttempts) {
                this.logDebug("Retrying fetch", { url, attempt });
                await this.delay(Math.min(2 ** attempt * 100, 5000));
                return this.fetchPartial(url, attempt + 1);
            }
            throw err;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    insertHTML(container, html) {
        const template = document.createElement("template");
        template.innerHTML = html;
        if (container instanceof HTMLLinkElement) {
            container.replaceWith(...template.content.childNodes);
        }
        else if (container instanceof Element) {
            container.innerHTML = "";
            container.append(...template.content.childNodes);
        }
        else {
            container.append(...template.content.childNodes);
        }
        this.logDebug("Inserted HTML into container", { container });
    }
    showError(container, error) {
        const div = document.createElement("div");
        div.className = "partial-error";
        div.textContent = "Partial load failed";
        if (this.options.debug)
            div.textContent += `: ${error.message}`;
        if (container instanceof HTMLLinkElement) {
            container.replaceWith(div);
        }
        else if (container instanceof Element) {
            container.innerHTML = "";
            container.appendChild(div);
        }
        else {
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
    isPartialLoaded(id) {
        return this.loadedPartials.has(id);
    }
    resolveUrl(src) {
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
        }
        catch (error) {
            this.logDebug("Failed to resolve URL", { src, error });
            return src;
        }
    }
    delay(ms) {
        this.logDebug("Delaying execution", { ms });
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async loadContainer(container = document) {
        const links = container.querySelectorAll('link[rel="partial"][src]');
        if (!links.length)
            return [];
        return this.load(Array.from(links));
    }
    watch(container = document.body) {
        if (!window.MutationObserver)
            return;
        const observer = new MutationObserver(debounce(() => this.loadContainer(container), 100));
        observer.observe(container, { childList: true, subtree: true });
        this.logDebug("Watching container for partials", { container });
        return observer;
    }
    async fetchWithLoaderCache(url) {
        if (this.options.cacheEnabled && this.cache.has(url)) {
            this.logDebug("Fetching from cache", { url });
            return this.cache.get(url);
        }
        const html = await this.fetchPartial(url);
        if (this.options.cacheEnabled)
            this.cache.set(url, html);
        this.logDebug("Fetched and cached partial", { url });
        return html;
    }
}
//# sourceMappingURL=PartialLoader.js.map