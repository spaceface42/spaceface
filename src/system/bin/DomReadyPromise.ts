// src/spaceface/system/bin/DomReadyPromise.ts

export const VERSION = 'nextworld-1.0.0' as const;

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
     * Equivalent to listening for `DOMContentLoaded`, but safe to call multiple times.
     *
     * @returns Promise that resolves once the DOM is ready.
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
     * Uses a `MutationObserver` to detect added nodes, with optional timeout and abort support.
     *
     * @typeParam T - Type of element(s) expected (extends Element).
     *
     * @param selectors - CSS selector string or array of selectors to wait for.
     * @param options - Options to control timeout, root element, and abort signal.
     * @returns Promise that resolves with the found element (if one selector) or array of elements (if multiple).
     * @throws DOMException `"TimeoutError"` if elements are not found within the timeout.
     * @throws DOMException `"AbortError"` if the operation is aborted via `AbortSignal`.
     */
    static waitForElement<T extends Element>(
        selectors: string | string[],
        options: WaitForElementOptions = {}
    ): Promise<T | T[]> {
        const { timeout = 5000, root = document, signal } = options;
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        const isMultiple = selectorList.length > 1;

        return new Promise((resolve, reject) => {
            let timeoutId: number | undefined;
            const foundElements: Map<string, T> = new Map();

            const cleanup = () => {
                observer.disconnect();
                if (timeoutId !== undefined) clearTimeout(timeoutId);
                if (signal) signal.removeEventListener('abort', onAbort);
            };

            const resolveFound = () => {
                const result = selectorList.map(s => foundElements.get(s)!);
                cleanup();
                resolve(isMultiple ? result : result[0]);
            };

            const check = () => {
                for (const selector of selectorList) {
                    if (!foundElements.has(selector)) {
                        const el = root.querySelector<T>(selector);
                        if (el) foundElements.set(selector, el);
                    }
                }
                if (foundElements.size === selectorList.length) {
                    resolveFound();
                    return true;
                }
                return false;
            };

            const onAbort = () => {
                cleanup();
                reject(new DOMException('waitForElement aborted', 'AbortError'));
            };

            if (signal) {
                if (signal.aborted) return onAbort();
                signal.addEventListener('abort', onAbort, { once: true });
            }

            // Initial check before observing
            if (check()) return;

            // Optimized observer: only reacts to added nodes
            const observer = new MutationObserver(mutations => {
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        if (check()) return;
                    }
                }
            });

            observer.observe(root, { childList: true, subtree: true });

            if (isFinite(timeout) && timeout > 0) {
                timeoutId = window.setTimeout(() => {
                    cleanup();
                    const missing = selectorList.filter(s => !foundElements.has(s));
                    reject(new DOMException(
                        `Element(s) "${missing.join(', ')}" not found in ${timeout}ms`,
                        'TimeoutError'
                    ));
                }, timeout);
            }
        });
    }
}
