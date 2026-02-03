// src/system/bin/PartialFetcher.ts
export const VERSION = 'nextworld-1.3.0' as const;

import { eventBus } from "./EventBus.js";
import { PartialLoader } from "./PartialLoader.js";
import type { PartialFetchOptionsInterface, PartialEventPayload, PartialLoaderLike, LogPayload } from "../types/bin.js";

export class PartialFetcher {
    /** Default internal loader instance */
    private static loader: PartialLoaderLike;

    /**
     * Get or create the default loader instance.
     * @returns The default loader instance.
     */
    private static getLoader(): PartialLoaderLike {
        return this.loader ?? (this.loader = new PartialLoader());
    }

    /**
     * Emit debug logs via EventBus.
     * @param message The debug message.
     * @param data Additional data to log.
     */
    private static logDebug(message: string, data?: unknown): void {
        const payload: LogPayload = {
            scope: "PartialFetcher",
            level: "debug",
            message,
            data,
            time: Date.now(),
        };
        eventBus.emit("log", payload);
    }

    /**
     * Load a partial HTML into a target container.
     * @param url The URL of the partial to load.
     * @param targetSelector The CSS selector of the target container.
     * @param options Additional options for the loader.
     */
    static async load(
        url: string,
        targetSelector: string,
        options: PartialFetchOptionsInterface = {}
    ): Promise<void> {
        const loader = options.loader ?? this.getLoader();
        const container = document.querySelector<HTMLElement>(targetSelector);
        if (!container) throw new Error(`Target ${targetSelector} not found`);

        try {
            this.logDebug("Fetching partial", { url, targetSelector });
            await loader.load([{ url, container }]);
            eventBus.emit<PartialEventPayload>("partial:loaded", { url, targetSelector, cached: false });
            this.logDebug("Partial loaded successfully", { url, targetSelector });
        } catch (error) {
            eventBus.emit<PartialEventPayload>("partial:error", { url, error });
            this.logDebug("Partial load error", { url, error });
            throw error;
        } finally {
            eventBus.emit<PartialEventPayload>("partial:load:complete", { url, targetSelector, error: false });
        }
    }

    /**
     * Preload multiple partials without rendering them.
     * @param urls The URLs of the partials to preload.
     * @param loader Optional custom loader instance.
     * @returns A promise that resolves when all partials are preloaded.
     */
    static async preload(urls: string[], loader?: PartialLoaderLike): Promise<void[]> {
        const activeLoader = loader ?? this.getLoader();
        const dummyContainer = document.createElement("div");

        return Promise.all(
            urls.map(async (url) => {
                try {
                    this.logDebug("Preloading partial", { url });
                    await activeLoader.load([{ url, container: dummyContainer }]);
                    eventBus.emit<PartialEventPayload>("partial:loaded", { url, cached: true });
                } catch (error) {
                    eventBus.emit<PartialEventPayload>("partial:error", { url, error });
                    this.logDebug("Preload error", { url, error });
                } finally {
                    eventBus.emit<PartialEventPayload>("partial:load:complete", { url, error: false });
                }
            })
        );
    }

    /**
     * Watch a container for dynamic partial loading.
     * @param container The container to watch.
     * @param loader Optional custom loader instance.
     * @returns The result of the loader's watch method.
     */
    static watch(container: HTMLElement | Document = document.body, loader?: PartialLoaderLike): unknown {
        const activeLoader = loader ?? this.getLoader();
        this.logDebug("Watching container for partials", { container });
        return activeLoader.watch?.(container);
    }
}
