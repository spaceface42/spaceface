// src/spaceface/system/bin/DomReadyPromise.ts

export const VERSION = 'nextworld-1.1.0' as const;

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
                : new Promise(resolve => {
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
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];

        if (timeout <= 0) {
            throw new TypeError('Timeout must be greater than 0');
        }

        return new Promise((resolve, reject) => {
            let timeoutId: number | undefined;
            const foundElements: Map<string, T> = new Map();

            const cleanup = () => {
                observer.disconnect();
                if (timeoutId !== undefined) clearTimeout(timeoutId);
                signal?.removeEventListener('abort', onAbort);
            };

            const checkAndResolve = () => {
                for (const selector of selectorList) {
                    if (!foundElements.has(selector)) {
                        const el = root.querySelector<T>(selector);
                        if (el) foundElements.set(selector, el);
                    }
                }
                if (foundElements.size === selectorList.length) {
                    cleanup();
                    resolve(selectorList.length === 1 ? foundElements.get(selectorList[0])! : Array.from(foundElements.values()));
                }
            };

            const onAbort = () => {
                cleanup();
                reject(new DOMException('waitForElement aborted', 'AbortError'));
            };

            // Abort signal handling
            if (signal?.aborted) return onAbort();
            signal?.addEventListener('abort', onAbort, { once: true });

            // Initial check before observing
            checkAndResolve();

            // Observe DOM mutations
            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        checkAndResolve();
                    }
                }
            });
            observer.observe(root, { childList: true, subtree: true });

            // Timeout handling
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
