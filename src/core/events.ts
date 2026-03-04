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

export class EventBus<TEvents extends object> {
  private listeners = new Map<string, Listener<unknown>[]>();

  on<K extends keyof TEvents & string>(
    event: K,
    fn: (payload: TEvents[K]) => void | Promise<void>,
    priority = 0
  ): UnsubscribeFn {
    const list = this.listeners.get(event) ?? [];
    const listener: Listener<TEvents[K]> = { fn, priority };

    let i = list.length;
    while (i > 0 && list[i - 1].priority < priority) i -= 1;
    list.splice(i, 0, listener as Listener<unknown>);
    this.listeners.set(event, list);

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

  off<K extends keyof TEvents & string>(event: K, fn: (payload: TEvents[K]) => void | Promise<void>): void {
    const list = this.listeners.get(event);
    if (!list) return;
    this.listeners.set(
      event,
      list.filter((listener) => listener.fn !== fn)
    );
  }

  emit<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): void {
    const list = [...(this.listeners.get(event) ?? [])] as Array<Listener<TEvents[K]>>;
    for (const listener of list) {
      try {
        Promise.resolve(listener.fn(payload)).catch((error) => {
          console.error(`[EventBus] listener failed for ${event}`, error);
        });
      } catch (error) {
        console.error(`[EventBus] listener failed for ${event}`, error);
      }
    }
  }

  async emitAsync<K extends keyof TEvents & string>(event: K, payload: TEvents[K]): Promise<void> {
    const list = [...(this.listeners.get(event) ?? [])] as Array<Listener<TEvents[K]>>;
    for (const listener of list) {
      try {
        await listener.fn(payload);
      } catch (error) {
        console.error(`[EventBus] listener failed for ${event}`, error);
      }
    }
  }
}

export const eventBus = new EventBus<AppEventMap>();
