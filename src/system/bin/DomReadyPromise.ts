// src/spaceface/system/bin/DomReadyPromise.ts

export const VERSION = 'nextworld-1.3.0' as const;

import { WaitForElementOptions } from '../types/bin.js';

/**
 * Utility class for DOM readiness and waiting for elements to appear.
 * Provides:
 * - A promise for when the DOM is ready (`DOMContentLoaded`).
 * - A helper to wait until specific elements are present in the DOM.
 */
export class DomReadyPromise {
    /** Cached promise that resolves once the DOM is ready */
    static #readyPromise: Promise<void> | null = null;

    /**
     * Returns a promise that resolves when the DOM is fully loaded.
     */
    static ready(): Promise<void> {
        if (!this.#readyPromise) {
            this.#readyPromise = document.readyState !== 'loading'
                ? Promise.resolve()
                : new Promise<void>(resolve => {
                    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
                });
        }
        return this.#readyPromise;
    }

    /**
     * Waits for one or more DOM elements to appear in the document.
     */
    static waitForElement<T extends Element>(
        selectors: string | string[],
        options: WaitForElementOptions = {}
    ): Promise<T | T[]> {
        const { timeout = 5000, root = document, signal } = options;
        if (timeout <= 0) {
            return Promise.reject(new TypeError('Timeout must be greater than 0'));
        }

        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        const foundElements: Map<string, T> = new Map();

        return new Promise((resolve, reject) => {
            let timeoutId: number | undefined;
            const checkForElements = () => {
                for (const selector of selectorList) {
                    if (!foundElements.has(selector)) {
                        const el = root.querySelector<T>(selector);
                        if (el) foundElements.set(selector, el);
                    }
                }
                if (foundElements.size === selectorList.length) {
                    cleanup();
                    resolve(selectorList.length === 1
                        ? foundElements.get(selectorList[0])!
                        : Array.from(foundElements.values()));
                }
            };

            const observer = new MutationObserver(checkForElements);

            const cleanup = () => {
                observer.disconnect();
                if (timeoutId !== undefined) clearTimeout(timeoutId);
                signal?.removeEventListener('abort', onAbort);
            };

            const onAbort = () => {
                cleanup();
                reject(new DOMException('waitForElement aborted', 'AbortError'));
            };

            if (signal?.aborted) return onAbort();
            signal?.addEventListener('abort', onAbort, { once: true });

            observer.observe(root, { childList: true, subtree: true });
            // Check immediately in case elements already exist
            checkForElements();

            timeoutId = window.setTimeout(() => {
                cleanup();
                const missing = selectorList.filter(s => !foundElements.has(s));
                reject(new DOMException(
                    `Element(s) "${missing.join(', ')}" not found within ${timeout}ms in root: ${root.nodeName}`,
                    'TimeoutError'
                ));
            }, timeout);
        });
    }
}
