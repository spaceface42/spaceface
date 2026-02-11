import { debounce, throttle } from './timing.js';
export const VERSION = 'nextworld-1.2.0';
export class ResizeManager {
    windowCallbacks = new Map();
    elementObservers = new Map();
    onWindow(cb, options) {
        let wrappedCb;
        if (options?.debounceMs != null) {
            wrappedCb = debounce(cb, options.debounceMs);
        }
        else if (options?.throttleMs != null) {
            wrappedCb = throttle(cb, options.throttleMs);
        }
        else {
            wrappedCb = cb;
            wrappedCb.cancel = () => { };
        }
        const handler = () => wrappedCb();
        this.windowCallbacks.set(cb, handler);
        window.addEventListener("resize", handler);
        return () => {
            window.removeEventListener("resize", handler);
            wrappedCb.cancel?.();
            this.windowCallbacks.delete(cb);
        };
    }
    onElement(el, cb, options) {
        let entry = this.elementObservers.get(el);
        if (!entry) {
            const callbacks = new Set();
            const observer = new ResizeObserver(() => {
                callbacks.forEach(fn => fn());
            });
            entry = { observer, callbacks };
            this.elementObservers.set(el, entry);
            observer.observe(el);
        }
        let wrappedCb;
        if (options?.debounceMs != null) {
            wrappedCb = debounce(cb, options.debounceMs);
        }
        else if (options?.throttleMs != null) {
            wrappedCb = throttle(cb, options.throttleMs);
        }
        else {
            wrappedCb = cb;
            wrappedCb.cancel = () => { };
        }
        entry.callbacks.add(wrappedCb);
        const callbacksRef = entry.callbacks;
        const observerRef = entry.observer;
        return () => {
            callbacksRef.delete(wrappedCb);
            wrappedCb.cancel?.();
            if (callbacksRef.size === 0) {
                observerRef.disconnect();
                this.elementObservers.delete(el);
            }
        };
    }
    getElement(el) {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
    }
    destroy() {
        for (const [cb, handler] of this.windowCallbacks.entries()) {
            window.removeEventListener("resize", handler);
        }
        this.windowCallbacks.clear();
        for (const entry of this.elementObservers.values()) {
            entry.observer.disconnect();
            for (const fn of entry.callbacks) {
                fn.cancel?.();
            }
        }
        this.elementObservers.clear();
    }
}
export const resizeManager = new ResizeManager();
//# sourceMappingURL=ResizeManager%20copy.js.map