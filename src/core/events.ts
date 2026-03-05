export type UnsubscribeFn = () => void;

export interface AppEventMap {
  "log:entry": {
    scope: string;
    level: "debug" | "info" | "warn" | "error";
    message: string;
    data?: unknown;
    time: number;
  };
  "startup:begin": { mode: string };
  "startup:feature:init": { feature: string; durationMs: number; ok: boolean; error?: unknown };
  "startup:ready": { initialized: string[]; failed: string[] };
  "startup:destroy": { reason: string };
  "route:changed": { path: string };
  "user:active": { at: number };
  "user:inactive": { at: number; idleMs: number };
  "screensaver:shown": { target: string };
  "screensaver:hidden": { target: string };
  "slideshow:next": { source: string };
  "slideshow:prev": { source: string };
}

interface Listener<TPayload> {
  fn: (payload: TPayload) => void | Promise<void>;
  priority: number;
}

interface AnyListener<TEvents extends object> {
  fn: <K extends keyof TEvents & string>(event: K, payload: TEvents[K]) => void | Promise<void>;
  priority: number;
}

type ListenerStore<T> = {
  [K in keyof T]?: Listener<T[K]>[];
};

export class EventBus<TEvents extends object> {
  private listeners: ListenerStore<TEvents> = {};
  private anyListeners: Array<AnyListener<TEvents>> = [];

  on<K extends keyof TEvents & string>(
    event: K,
    fn: (payload: TEvents[K]) => void | Promise<void>,
    priority = 0
  ): UnsubscribeFn {
    const list = this.listeners[event] ?? [];
    const listener: Listener<TEvents[K]> = { fn, priority };

    let i = list.length;
    while (i > 0 && list[i - 1].priority < priority) i -= 1;
    list.splice(i, 0, listener);
    this.listeners[event] = list;

    return () => this.off(event, fn);
  }

  once<K extends keyof TEvents & string>(
    event: K,
    fn: (payload: TEvents[K]) => void | Promise<void>,
    priority = 0
  ): UnsubscribeFn {
    const wrapper = (payload: TEvents[K]) => {
      this.off(event, wrapper);
      return fn(payload);
    };
    return this.on(event, wrapper, priority);
  }

  onAny(
    fn: <K extends keyof TEvents & string>(event: K, payload: TEvents[K]) => void | Promise<void>,
    priority = 0
  ): UnsubscribeFn {
    const listener: AnyListener<TEvents> = { fn, priority };
    let i = this.anyListeners.length;
    while (i > 0 && this.anyListeners[i - 1].priority < priority) i -= 1;
    this.anyListeners.splice(i, 0, listener);
    return () => this.offAny(fn);
  }

  onceAny(
    fn: <K extends keyof TEvents & string>(event: K, payload: TEvents[K]) => void | Promise<void>,
    priority = 0
  ): UnsubscribeFn {
    const wrapper = <K extends keyof TEvents & string>(event: K, payload: TEvents[K]) => {
      this.offAny(wrapper);
      return fn(event, payload);
    };
    return this.onAny(wrapper, priority);
  }

  off<K extends keyof TEvents & string>(event: K, fn: (payload: TEvents[K]) => void | Promise<void>): void {
    const list = this.listeners[event];
    if (!list) return;
    this.listeners[event] = list.filter((listener) => listener.fn !== fn);
  }

  offAny(fn: <K extends keyof TEvents & string>(event: K, payload: TEvents[K]) => void | Promise<void>): void {
    this.anyListeners = this.anyListeners.filter((listener) => listener.fn !== fn);
  }

  private reportError(event: string, error: unknown): void {
    console.error(`[EventBus] listener failed for ${event}`, error);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new ErrorEvent("error", { error, message: `[EventBus] listener failed for ${event}` }));
    }
  }

  emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): void {
    const list = [...(this.listeners[event] ?? [])];
    const anyList = [...this.anyListeners];
    for (const listener of list) {
      try {
        Promise.resolve(listener.fn(payload)).catch((error) => this.reportError(event, error));
      } catch (error) {
        this.reportError(event, error);
      }
    }
    for (const listener of anyList) {
      try {
        Promise.resolve(listener.fn(event, payload)).catch((error) => this.reportError(`onAny(${event})`, error));
      } catch (error) {
        this.reportError(`onAny(${event})`, error);
      }
    }
  }

  async emitAsync<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): Promise<void> {
    const list = [...(this.listeners[event] ?? [])];
    const anyList = [...this.anyListeners];
    for (const listener of list) {
      try {
        await listener.fn(payload);
      } catch (error) {
        this.reportError(event, error);
      }
    }
    for (const listener of anyList) {
      try {
        await listener.fn(event, payload);
      } catch (error) {
        this.reportError(`onAny(${event})`, error);
      }
    }
  }
}

export const eventBus = new EventBus<AppEventMap>();
