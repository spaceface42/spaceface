export const VERSION = 'nextworld-1.1.0';

type ResizeCallback = () => void;

interface IElementObserverEntry {
  observer: ResizeObserver;
  callbacks: Set<ResizeCallback>;
}

export class ResizeManager {
  private windowCallbacks: Map<ResizeCallback, EventListener> = new Map();
  private elementObservers: Map<Element, IElementObserverEntry> = new Map();

  onWindow(cb: ResizeCallback): () => void {
    const handler = () => cb();
    this.windowCallbacks.set(cb, handler);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("resize", handler);
      this.windowCallbacks.delete(cb);
    };
  }

  onElement(el: Element, cb: ResizeCallback): () => void {
    let entry = this.elementObservers.get(el);
    if (!entry) {
      const observer = new ResizeObserver(() => {
        entry!.callbacks.forEach(fn => fn());
      });
      entry = { observer, callbacks: new Set() };
      this.elementObservers.set(el, entry);
      observer.observe(el);
    }
    entry.callbacks.add(cb);

    return () => {
      entry!.callbacks.delete(cb);
      if (entry.callbacks.size === 0) {
        entry.observer.disconnect();
        this.elementObservers.delete(el);
      }
    };
  }

  getElement(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  destroy() {
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

// singleton instance
export const resizeManager = new ResizeManager();
