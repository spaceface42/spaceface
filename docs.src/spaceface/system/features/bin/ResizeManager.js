export const VERSION = '2.0.0';
import { debounce, throttle } from './timing.js';
export class ResizeManager {
    windowCallbacks = new Map();
    elementObservers = new Map();
    debug = false;
    setDebugMode(enabled) {
        this.debug = enabled;
    }
    logDebug(message, data) {
        if (!this.debug)
            return;
        console.debug(`[ResizeManager] ${message}`, data);
    }
    wrapCallback(cb, options) {
        if (options?.debounceMs != null) {
            return debounce(cb, options.debounceMs);
        }
        else if (options?.throttleMs != null) {
            return throttle(cb, options.throttleMs);
        }
        else {
            const wrappedCb = cb;
            wrappedCb.cancel = () => { };
            return wrappedCb;
        }
    }
    onWindow(cb, options = { debounceMs: 200 }) {
        const wrappedCb = debounce(cb, options.debounceMs);
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
        this.logDebug("Registering element resize callback", { el, cb, options });
        let entry = this.elementObservers.get(el);
        if (!entry) {
            const callbacks = new Set();
            const observer = new ResizeObserver((entries) => {
                try {
                    const entry = entries[0];
                    callbacks.forEach(fn => fn(entry));
                }
                catch (error) {
                    this.logDebug("ResizeObserver callback error", { error });
                }
            });
            entry = { observer, callbacks };
            this.elementObservers.set(el, entry);
            observer.observe(el);
        }
        const wrappedCb = this.wrapCallback(cb, options);
        entry.callbacks.add(wrappedCb);
        return () => {
            this.logDebug("Removing element resize callback", { el, cb });
            entry.callbacks.delete(wrappedCb);
            wrappedCb.cancel?.();
            if (entry.callbacks.size === 0) {
                entry.observer.disconnect();
                this.elementObservers.delete(el);
            }
        };
    }
    getElement(el) {
        try {
            const rect = el.getBoundingClientRect();
            return { width: rect.width, height: rect.height };
        }
        catch (error) {
            throw new Error("ResizeManager: Failed to get element size.");
        }
    }
    destroy() {
        this.logDebug("Destroying ResizeManager");
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
        this.logDebug("ResizeManager destroyed");
    }
}
export const resizeManager = new ResizeManager();
//# sourceMappingURL=ResizeManager.js.map