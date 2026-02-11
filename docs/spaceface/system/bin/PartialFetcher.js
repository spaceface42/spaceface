export const VERSION = '2.0.0';
import { eventBus } from "./EventBus.js";
import { PartialLoader } from "./PartialLoader.js";
export class PartialFetcher {
    static loader;
    static getLoader() {
        return this.loader ?? (this.loader = new PartialLoader());
    }
    static logDebug(message, data) {
        const payload = {
            scope: "PartialFetcher",
            level: "debug",
            message,
            data,
            time: Date.now(),
        };
        eventBus.emit("log", payload);
    }
    static async load(url, targetSelector, options = {}) {
        const loader = options.loader ?? this.getLoader();
        const container = document.querySelector(targetSelector);
        if (!container)
            throw new Error(`Target ${targetSelector} not found`);
        try {
            this.logDebug("Fetching partial", { url, targetSelector });
            await loader.load([{ url, container }]);
            eventBus.emit("partial:loaded", { url, targetSelector, cached: false });
            this.logDebug("Partial loaded successfully", { url, targetSelector });
        }
        catch (error) {
            eventBus.emit("partial:error", { url, error });
            this.logDebug("Partial load error", { url, error });
            throw error;
        }
        finally {
            eventBus.emit("partial:load:complete", { url, targetSelector, error: false });
        }
    }
    static async preload(urls, loader) {
        const activeLoader = loader ?? this.getLoader();
        const dummyContainer = document.createElement("div");
        return Promise.all(urls.map(async (url) => {
            try {
                this.logDebug("Preloading partial", { url });
                await activeLoader.load([{ url, container: dummyContainer }]);
                eventBus.emit("partial:loaded", { url, cached: true });
            }
            catch (error) {
                eventBus.emit("partial:error", { url, error });
                this.logDebug("Preload error", { url, error });
            }
            finally {
                eventBus.emit("partial:load:complete", { url, error: false });
            }
        }));
    }
    static watch(container = document.body, loader) {
        const activeLoader = loader ?? this.getLoader();
        this.logDebug("Watching container for partials", { container });
        return activeLoader.watch?.(container);
    }
}
//# sourceMappingURL=PartialFetcher.js.map