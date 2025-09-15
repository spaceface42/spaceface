// src/system/bin/PartialFetcher.ts
export const VERSION = 'nextworld-1.0.1' as const;

import { eventBus } from "./EventBus.js";
import { PartialLoader } from "./PartialLoader.js";
import type { PartialFetchOptionsInterface, PartialEventPayload, PartialLoaderLike } from "../types/bin.js";

export class PartialFetcher {
    /** default internal loader instance */
    private static loader: PartialLoaderLike;

    private static getLoader(): PartialLoaderLike {
        if (!this.loader) {
            this.loader = new PartialLoader();
        }
        return this.loader;
    }

    /** emit debug logs via EventBus instead of console.debug */
    private static logDebug(msg: string, data?: unknown) {
        eventBus.emit("log:debug", { scope: "PartialFetcher", message: msg, data });
    }

    static async load(
        url: string,
        targetSelector: string,
        options: PartialFetchOptionsInterface = {}
    ): Promise<void> {
        const loader = options.loader ?? this.getLoader();
        try {
            this.logDebug("Fetching partial", { url, targetSelector });

            const container = document.querySelector<HTMLElement>(targetSelector);
            if (!container) throw new Error(`Target ${targetSelector} not found`);

            await loader.load([{ url, container }]);

            eventBus.emit<PartialEventPayload>("partial:loaded", { url, targetSelector, cached: false });
            this.logDebug("Partial loaded successfully", { url, targetSelector });
        } catch (error) {
            eventBus.emit<PartialEventPayload>("partial:error", { url, error });
            this.logDebug("Partial load error", { url, error });
            throw error;
        } finally {
            eventBus.emit<PartialEventPayload>("partial:load:complete", { url, targetSelector });
        }
    }

    static async preload(urls: string[], loader?: PartialLoaderLike): Promise<void[]> {
        const activeLoader = loader ?? this.getLoader();
        return Promise.all(
            urls.map(async (url) => {
                try {
                    await activeLoader.load([{ url, container: document.createElement("div") }]);
                    eventBus.emit<PartialEventPayload>("partial:loaded", { url, cached: true });
                    this.logDebug("Partial preloaded", { url });
                } catch (error) {
                    eventBus.emit<PartialEventPayload>("partial:error", { url, error });
                    this.logDebug("Preload error", { url, error });
                } finally {
                    eventBus.emit<PartialEventPayload>("partial:load:complete", { url });
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
