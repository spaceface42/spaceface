// src/spaceface/system/features/bin/ResizeManager.ts

import { debounce, throttle, CancellableFunction } from './timing.js';

export const VERSION = 'nextworld-1.2.0' as const;

type ResizeCallback = () => void;

interface ElementObserverEntryInterface {
  observer: ResizeObserver;
  callbacks: Set<ResizeCallback>;
}

type ElementSize = { width: number; height: number };

export class ResizeManager {
  private windowCallbacks: Map<ResizeCallback, EventListener> = new Map();
  private elementObservers: Map<Element, ElementObserverEntryInterface> = new Map();

  /**
   * Register a callback for window resize events.
   * Optionally debounce or throttle the callback.
   */
  onWindow(
    cb: ResizeCallback,
    options?: { debounceMs?: number; throttleMs?: number }
  ): () => void {
    let wrappedCb: CancellableFunction<() => void>;

    if (options?.debounceMs != null) {
      wrappedCb = debounce(cb, options.debounceMs);
    } else if (options?.throttleMs != null) {
      wrappedCb = throttle(cb, options.throttleMs);
    } else {
      wrappedCb = cb as CancellableFunction<() => void>;
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
    cb: ResizeCallback,
    options?: { debounceMs?: number; throttleMs?: number }
  ): () => void {
    let entry = this.elementObservers.get(el);

    if (!entry) {
      const callbacks = new Set<ResizeCallback>();
      const observer = new ResizeObserver(() => {
        callbacks.forEach(fn => fn());
      });

      entry = { observer, callbacks };
      this.elementObservers.set(el, entry);
      observer.observe(el);
    }

    // Wrap the callback if debounce or throttle is specified
    let wrappedCb: CancellableFunction<() => void>;

    if (options?.debounceMs != null) {
      wrappedCb = debounce(cb, options.debounceMs);
    } else if (options?.throttleMs != null) {
      wrappedCb = throttle(cb, options.throttleMs);
    } else {
      wrappedCb = cb as CancellableFunction<() => void>;
      wrappedCb.cancel = () => {};
    }

    entry.callbacks.add(wrappedCb);

    const callbacksRef = entry.callbacks;
    const observerRef = entry.observer;

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
  getElement(el: HTMLElement): ElementSize {
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
      entry.observer.disconnect();
    }
    this.elementObservers.clear();
  }
}

// Singleton instance
export const resizeManager = new ResizeManager();
