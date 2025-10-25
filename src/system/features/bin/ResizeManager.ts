// src/spaceface/system/features/bin/ResizeManager.ts

import { debounce, throttle, CancellableFunction } from './timing.js';

export const VERSION = 'nextworld-1.2.0' as const;

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

  /**
   * Register a callback for window resize events.
   * Optionally debounce or throttle the callback.
   */
  onWindow(
    cb: WindowResizeCallback,
    options?: { debounceMs?: number; throttleMs?: number }
  ): () => void {
    let wrappedCb: CancellableFunction<WindowResizeCallback>;

    if (options?.debounceMs != null) {
      wrappedCb = debounce(cb, options.debounceMs);
    } else if (options?.throttleMs != null) {
      wrappedCb = throttle(cb, options.throttleMs);
    } else {
      wrappedCb = cb as CancellableFunction<WindowResizeCallback>;
      wrappedCb.cancel = () => {};
    }

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
    let entry = this.elementObservers.get(el) as ElementObserverEntryInterface | undefined;

    if (!entry) {
      const callbacks = new Set<CancellableFunction<ElementResizeCallback>>();
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        callbacks.forEach(fn => fn(entry));
      });

      entry = { observer, callbacks };
      this.elementObservers.set(el, entry);
      observer.observe(el);
    }

    // Wrap the callback if debounce or throttle is specified
    let wrappedCb: CancellableFunction<ElementResizeCallback>;

    if (options?.debounceMs != null) {
      wrappedCb = debounce(cb, options.debounceMs);
    } else if (options?.throttleMs != null) {
      wrappedCb = throttle(cb, options.throttleMs);
    } else {
      wrappedCb = cb as CancellableFunction<ElementResizeCallback>;
      wrappedCb.cancel = () => {};
    }

    entry.callbacks.add(wrappedCb);

    const callbacksRef = entry!.callbacks;
    const observerRef = entry!.observer;

    return (): void => {
      callbacksRef.delete(wrappedCb);
      wrappedCb.cancel?.();
      if (callbacksRef.size === 0) {
        observerRef.disconnect();
        this.elementObservers.delete(el);
      }
    };
  }

  /**
   * Get current size of an element.
   */
  getElement(el: Element): ElementSize {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  /**
   * Cleanup all registered window and element callbacks.
   */
  destroy(): void {
    for (const [cb, handler] of this.windowCallbacks.entries()) {
      window.removeEventListener("resize", handler);
    }
    this.windowCallbacks.clear();

    for (const entry of this.elementObservers.values()) {
      // disconnect observer and cancel any pending debounced/throttled callbacks
      entry.observer.disconnect();
      for (const fn of entry.callbacks) {
        fn.cancel?.();
      }
    }
    this.elementObservers.clear();
  }
}

// Singleton instance
export const resizeManager = new ResizeManager();
