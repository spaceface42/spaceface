// src/spaceface/system/features/bin/ResizeManager.ts

export const VERSION = 'nextworld-1.3.0' as const;

import { debounce, throttle, CancellableFunction } from './timing.js';

type WindowResizeCallback = () => void;
type ElementResizeCallback = (entry: ResizeObserverEntry) => void;

interface ElementObserverEntryInterface {
  observer: ResizeObserver;
  callbacks: Set<CancellableFunction<ElementResizeCallback>>;
}

type ElementSize = { width: number; height: number };

export class ResizeManager {
  private windowCallbacks: Map<WindowResizeCallback, EventListener> = new Map();
  private elementObservers: Map<Element, ElementObserverEntryInterface> = new Map();

  private logDebug(message: string, data?: unknown): void {
    // Disable debug output for resize events
    // if (message.includes("resize")) return;
    console.debug(`[ResizeManager] ${message}`, data);
  }

  private wrapCallback<T extends (...args: any[]) => void>(
    cb: T,
    options?: { debounceMs?: number; throttleMs?: number }
  ): CancellableFunction<T> {
    if (options?.debounceMs != null) {
      return debounce(cb as (...args: any[]) => void, options.debounceMs) as CancellableFunction<T>;
    } else if (options?.throttleMs != null) {
      return throttle(cb as (...args: any[]) => void, options.throttleMs) as CancellableFunction<T>;
    } else {
      const wrappedCb = cb as CancellableFunction<T>;
      wrappedCb.cancel = () => {};
      return wrappedCb;
    }
  }

  /**
   * Register a callback for window resize events.
   * Optionally debounce or throttle the callback.
   */
  onWindow(
    cb: WindowResizeCallback,
    options: { debounceMs: number } = { debounceMs: 200 }
  ): () => void {
    const wrappedCb = debounce(cb, options.debounceMs);
    const handler = () => wrappedCb();

    this.windowCallbacks.set(cb, handler);
    window.addEventListener("resize", handler);

    return (): void => {
      window.removeEventListener("resize", handler);
      wrappedCb.cancel?.();
      this.windowCallbacks.delete(cb);
    };
  }

  /**
   * Register a callback for an element's resize events.
   * Optionally debounce or throttle the callback.
   */
  onElement(
    el: Element,
    cb: ElementResizeCallback,
    options?: { debounceMs?: number; throttleMs?: number }
  ): () => void {
    this.logDebug("Registering element resize callback", { el, cb, options });
    let entry = this.elementObservers.get(el);

    if (!entry) {
      const callbacks = new Set<CancellableFunction<ElementResizeCallback>>();
      const observer = new ResizeObserver((entries) => {
        try {
          const entry = entries[0];
          callbacks.forEach(fn => fn(entry));
        } catch (error) {
          this.logDebug("ResizeObserver callback error", { error });
        }
      });

      entry = { observer, callbacks };
      this.elementObservers.set(el, entry);
      observer.observe(el);
    }

    const wrappedCb = this.wrapCallback(cb, options);
    entry.callbacks.add(wrappedCb);

    return (): void => {
      this.logDebug("Removing element resize callback", { el, cb });
      entry!.callbacks.delete(wrappedCb);
      wrappedCb.cancel?.();
      if (entry!.callbacks.size === 0) {
        entry!.observer.disconnect();
        this.elementObservers.delete(el);
      }
    };
  }

  /**
   * Get current size of an element.
   */
  getElement(el: Element): ElementSize {
    try {
      const rect = el.getBoundingClientRect();
      // this.logDebug("Getting element size", { el, rect });
      return { width: rect.width, height: rect.height };
    } catch (error) {
      // this.logDebug("Error getting element size", { el, error });
      throw new Error("ResizeManager: Failed to get element size.");
    }
  }

  /**
   * Cleanup all registered window and element callbacks.
   */
  destroy(): void {
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

// Singleton instance
export const resizeManager = new ResizeManager();
