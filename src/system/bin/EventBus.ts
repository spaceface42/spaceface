export const VERSION = 'nextworld-1.2.0' as const;

import {
    UnsubscribeFn,
    ListenerInterface,
    AnyListenerInterface,
    EventBusErrorPayloadInterface,
    EventBusInterface
} from '../types/bin.js';

export class EventBus implements EventBusInterface {
    private listeners: Record<string, ListenerInterface[]> = {};
    private anyListeners: AnyListenerInterface[] = [];
    private onceWrappers = new WeakMap<Function, Function>();
    private emittingError = false;

    on<T = any>(event: string, fn: (payload: T) => any, priority = 0): UnsubscribeFn {
        const list = this.listeners[event] ??= [];
        const listener: ListenerInterface = { fn, priority };
        let i = list.length;
        while (i > 0 && list[i - 1].priority < priority) i--;
        list.splice(i, 0, listener);
        return () => this.off(event, fn);
    }

    once<T = any>(event: string, fn: (payload: T) => any, priority = 0): UnsubscribeFn {
        const wrapper = (payload: T) => {
            this.off(event, wrapper);
            fn(payload);
        };
        this.onceWrappers.set(fn, wrapper);
        this.on(event, wrapper, priority);
        return () => this.off(event, fn);
    }

    onAny(fn: (event: string, payload: any) => any, priority = 0): UnsubscribeFn {
        const listener: AnyListenerInterface = { fn, priority };
        let i = this.anyListeners.length;
        while (i > 0 && this.anyListeners[i - 1].priority < priority) i--;
        this.anyListeners.splice(i, 0, listener);
        return () => this.offAny(fn);
    }

    off(event: string, fn: Function) {
        const list = this.listeners[event];
        if (!list) return;
        const wrapper = this.onceWrappers.get(fn) ?? fn;
        this.listeners[event] = list.filter(l => l.fn !== wrapper);
    }

    offAny(fn: Function) {
        this.anyListeners = this.anyListeners.filter(l => l.fn !== fn);
    }

    emit<T = any>(event: string, payload?: T) {
        if (!event) return this._handleError("Event name is undefined or empty", new Error());

        // iterate a snapshot so listeners can add/remove themselves safely
        const list = [...(this.listeners[event] ?? [])];
        for (const l of list) try { l.fn(payload); } catch (err) { this._handleError(`Error in listener for "${event}"`, err); }

        const anyList = [...this.anyListeners];
        for (const l of anyList) try { l.fn(event, payload); } catch (err) { this._handleError(`Error in any-listener for "${event}"`, err); }
    }

    async emitAsync<T = any>(event: string, payload?: T): Promise<any[]> {
        if (!event) { this._handleError("Event name is undefined or empty", new Error()); return []; }

        const results: any[] = [];
        const list = [...(this.listeners[event] ?? [])];
        for (const l of list) try { results.push(await l.fn(payload)); } catch (err) { this._handleError(`Async error in listener for "${event}"`, err); }
        const anyList = [...this.anyListeners];
        for (const l of anyList) try { results.push(await l.fn(event, payload)); } catch (err) { this._handleError(`Async error in any-listener for "${event}"`, err); }

        return results;
    }

    removeAllListeners(event?: string) {
        if (!event) {
            this.listeners = {};
            this.anyListeners = [];
        } else if (event === "any") {
            this.anyListeners = [];
        } else {
            delete this.listeners[event];
        }
    }

    hasListeners(event: string) {
        return event === "any"
            ? this.anyListeners.length > 0
            : (this.listeners[event]?.length ?? 0) > 0;
    }

    listenerCount(event: string) {
        return event === "any"
            ? this.anyListeners.length
            : (this.listeners[event]?.length ?? 0);
    }

    eventNames() {
        return Object.keys(this.listeners).filter(e => this.listeners[e].length > 0);
    }

    getListeners(event: string) {
        return event === "any"
            ? this.anyListeners.map(l => l.fn)
            : (this.listeners[event] ?? []).map(l => l.fn);
    }

    private _handleError(message: string, error: any) {
        if (this.emittingError) return;
        if (message.includes("eventbus:error")) return;

        if (this.hasListeners('eventbus:error')) {
            try {
                this.emittingError = true;
                this.emit<EventBusErrorPayloadInterface>("eventbus:error", { message, error });
            } finally {
                this.emittingError = false;
            }
        }
    }
}

export const eventBus = new EventBus();
