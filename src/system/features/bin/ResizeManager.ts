export const VERSION = 'nextworld-1.1.0' as const;

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
   * Returns a cleanup function to remove the listener.
   */
  onWindow(cb: ResizeCallback): () => void {
    const handler = () => cb();
    this.windowCallbacks.set(cb, handler);
    window.addEventListener("resize", handler);

    return (): void => {
      window.removeEventListener("resize", handler);
      this.windowCallbacks.delete(cb);
    };
  }

  /**
   * Register a callback for an element's resize events.
   * Reuses existing ResizeObserver for the element if available.
   * Returns a cleanup function to remove the observer/callback.
   */
  onElement(el: Element, cb: ResizeCallback): () => void {
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

    // Add the callback to the existing set
    entry.callbacks.add(cb);

    // Capture references locally for safe cleanup
    const callbacksRef = entry.callbacks;
    const observerRef = entry.observer;

    return (): void => {
      callbacksRef.delete(cb);

      // If no callbacks remain, disconnect the observer and clean up
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
    // Remove window listeners
    for (const [cb, handler] of this.windowCallbacks.entries()) {
      window.removeEventListener("resize", handler);
    }
    this.windowCallbacks.clear();

    // Disconnect element observers
    for (const entry of this.elementObservers.values()) {
      entry.observer.disconnect();
    }
    this.elementObservers.clear();
  }
}

// Singleton instance
export const resizeManager = new ResizeManager();
