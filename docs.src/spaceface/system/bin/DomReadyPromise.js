export const VERSION = '2.0.0';
export class DomReadyPromise {
    static #readyPromise = null;
    static ready() {
        if (!this.#readyPromise) {
            this.#readyPromise = document.readyState !== 'loading'
                ? Promise.resolve()
                : new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
                });
        }
        return this.#readyPromise;
    }
    static waitForElement(selectors, options = {}) {
        const { timeout = 5000, root = document, signal } = options;
        if (timeout <= 0) {
            return Promise.reject(new TypeError('Timeout must be greater than 0'));
        }
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        const foundElements = new Map();
        return new Promise((resolve, reject) => {
            const checkForElements = () => {
                for (const selector of selectorList) {
                    if (!foundElements.has(selector)) {
                        const el = root.querySelector(selector);
                        if (el)
                            foundElements.set(selector, el);
                    }
                }
                if (foundElements.size === selectorList.length) {
                    cleanup();
                    resolve(selectorList.length === 1
                        ? foundElements.get(selectorList[0])
                        : Array.from(foundElements.values()));
                }
            };
            const observer = new MutationObserver(checkForElements);
            if (signal?.aborted) {
                reject(new DOMException('waitForElement aborted', 'AbortError'));
                return;
            }
            const timeoutId = window.setTimeout(() => {
                cleanup();
                const missing = selectorList.filter(s => !foundElements.has(s));
                reject(new DOMException(`Element(s) "${missing.join(', ')}" not found within ${timeout}ms in root: ${root.nodeName}`, 'TimeoutError'));
            }, timeout);
            const cleanup = () => {
                observer.disconnect();
                clearTimeout(timeoutId);
                signal?.removeEventListener('abort', onAbort);
            };
            const onAbort = () => {
                cleanup();
                reject(new DOMException('waitForElement aborted', 'AbortError'));
            };
            signal?.addEventListener('abort', onAbort, { once: true });
            observer.observe(root, { childList: true, subtree: true });
            checkForElements();
        });
    }
}
//# sourceMappingURL=DomReadyPromise.js.map