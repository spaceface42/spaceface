export const VERSION = '2.0.0';
export class AsyncImageLoader {
    container;
    includePicture;
    debug;
    cache = new WeakMap();
    destroyed = false;
    constructor(container, options = {}) {
        if (!(container instanceof Element)) {
            throw new Error("AsyncImageLoader: container must be a DOM Element.");
        }
        this.container = container;
        this.includePicture = options.includePicture ?? false;
        this.debug = options.debug ?? false;
    }
    logDebug(message, data) {
        if (!this.debug)
            return;
        console.debug(`[AsyncImageLoader] ${message}`, data);
    }
    ensureActive(methodName) {
        if (this.destroyed || !this.container) {
            throw new Error(`AsyncImageLoader: Instance destroyed. Method: ${methodName}`);
        }
    }
    getImages(selector = "img") {
        this.ensureActive("getImages");
        if (!selector.trim())
            return [];
        const images = new Set();
        this.container.querySelectorAll(selector).forEach(el => {
            if (el instanceof HTMLImageElement) {
                if (!this.includePicture && el.closest("picture"))
                    return;
                images.add(el);
            }
        });
        return [...images];
    }
    async waitForImagesToLoad(selector = "img", includeFailed = false, timeout = 10000) {
        this.logDebug("Waiting for images to load", { selector, includeFailed, timeout });
        const images = this.getImages(selector);
        const results = await Promise.all(images.map(img => {
            if (this.cache.has(img)) {
                this.logDebug("Image already cached", { img });
                return { element: img, loaded: true };
            }
            if (img.complete && img.naturalWidth > 0) {
                this.cache.set(img, true);
                this.logDebug("Image already loaded", { img });
                return { element: img, loaded: true };
            }
            return new Promise(resolve => {
                const onLoad = () => {
                    clearTimeout(timer);
                    this.cache.set(img, true);
                    this.logDebug("Image loaded successfully", { img });
                    resolve({ element: img, loaded: true });
                };
                const onError = () => {
                    clearTimeout(timer);
                    this.logDebug("Image failed to load", { img });
                    resolve({ element: img, loaded: false });
                };
                const timer = setTimeout(() => {
                    img.removeEventListener("load", onLoad);
                    img.removeEventListener("error", onError);
                    this.logDebug("Image load timeout", { img });
                    resolve({ element: img, loaded: false });
                }, timeout);
                img.addEventListener("load", onLoad, { once: true });
                img.addEventListener("error", onError, { once: true });
            });
        }));
        return includeFailed
            ? results
            : results.filter(r => r.loaded).map(r => r.element);
    }
    getImageData(selector = "img") {
        return this.getImages(selector).map(img => {
            const sources = [];
            if (this.includePicture) {
                const picture = img.closest("picture");
                if (picture) {
                    picture.querySelectorAll("source").forEach(source => {
                        sources.push({
                            srcset: source.srcset || "",
                            type: source.type || "",
                            media: source.media || ""
                        });
                    });
                }
            }
            return {
                element: img,
                src: img.src || "",
                alt: img.alt || "",
                href: img.closest("a")?.href ?? null,
                sources
            };
        });
    }
    clearCache() {
        this.logDebug("Clearing image cache");
        this.cache = new WeakMap();
    }
    destroy() {
        this.container = null;
        this.destroyed = true;
    }
}
//# sourceMappingURL=AsyncImageLoader.js.map