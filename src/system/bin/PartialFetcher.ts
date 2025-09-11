// src/spaceface/system/bin/PartialFetcher.ts

export const VERSION = 'nextworld-1.0.0' as const;

import { eventBus } from "./EventBus.js";
import { EventBinder } from "./EventBinder.js";
import { PartialFetchOptionsInterface } from "../types/bin.js";

export class PartialFetcher {
    /**
     * Loads HTML from a URL and injects it into the target element.
     * Emits lifecycle events: partial:load:start, partial:load:success, partial:load:error, partial:load:complete
     */
    static async load(
        url: string,
        targetSelector: string,
        options: PartialFetchOptionsInterface = {}
    ): Promise<{ container: HTMLElement; html: string }> {
        const { replace = true, signal, withBindings, debugBindings = false } = options;

        const runLoad = async (): Promise<{ container: HTMLElement; html: string }> => {
            const basePayload = { url, targetSelector };
            eventBus.emit("partial:load:start", basePayload);

            try {
                const fetchOptions = signal ? { signal } : undefined;
                const response = await fetch(url, fetchOptions);
                if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);

                const html = (await response.text()).trim();
                const container = document.querySelector<HTMLElement>(targetSelector);
                if (!container) throw new Error(`Target container not found: ${targetSelector}`);

                const template = document.createElement("template");
                template.innerHTML = html;

                if (replace) container.replaceChildren(...template.content.childNodes);
                else container.append(...template.content.childNodes);

                eventBus.emit("partial:load:success", { ...basePayload, html });
                return { container, html };
            } catch (error) {
                eventBus.emit("partial:load:error", { ...basePayload, error });
                throw error;
            } finally {
                eventBus.emit("partial:load:complete", basePayload);
            }
        };

        if (typeof withBindings === "function") {
            return EventBinder.withAutoUnbind(async (binder) => {
                if (signal) binder.attachTo(signal);
                withBindings(binder);
                return runLoad();
            }, debugBindings);
        } else {
            return runLoad();
        }
    }
}
