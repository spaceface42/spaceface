// src/system/bin/PartialFetcher.ts
export const VERSION = 'nextworld-1.0.1' as const;

import { eventBus } from "./EventBus.js";
import { PartialLoader } from "./PartialLoader.js";
import type { PartialFetchOptionsInterface, PartialEventPayload, PartialLoaderLike } from "../types/bin.js";

export class PartialFetcher {
    /** Default internal loader instance */
    private static loader: PartialLoaderLike;

    private static getLoader(): PartialLoaderLike {
        return this.loader ?? (this.loader = new PartialLoader());
    }

    /** Emit debug logs via EventBus */
    private static logDebug(message: string, data?: unknown) {
        eventBus.emit("log", { scope: "PartialFetcher", level: "debug", message, data });
    }

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

    static watch(container: HTMLElement | Document = document.body, loader?: PartialLoaderLike) {
        const activeLoader = loader ?? this.getLoader();
        this.logDebug("Watching container for partials", { container });
        return activeLoader.watch?.(container);
    }
}
