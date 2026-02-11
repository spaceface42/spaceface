export const VERSION = '2.0.0' as const;

import {
    UnsubscribeFn,
    ListenerInterface,
    AnyListenerInterface,
    EventBusInterface
} from '../types/bin.js';

export class EventBus implements EventBusInterface {
    private listeners: Map<string, ListenerInterface[]> = new Map();
    private anyListeners: AnyListenerInterface[] = [];
    private onceWrappers = new WeakMap<Function, Function>();
    private emittingError = false;
    private debugMode = false; // Debug mode flag

    /**
     * Enable or disable debug mode.
     * @param enable Set to true to enable debug mode, false to disable.
     */
    setDebugMode(enable: boolean): void {
        this.debugMode = enable;
        if (this.debugMode) {
            console.debug("[EventBus] Debug mode enabled");
        }
    }

    /**
     * Register an event listener.
     * @param event The event name.
     * @param fn The listener function.
     * @param priority The priority of the listener.
     * @returns A function to unsubscribe the listener.
     */
    on<T = any>(event: string, fn: (payload: T) => any, priority = 0): UnsubscribeFn {
        const list = this.listeners.get(event) ?? [];
        const listener: ListenerInterface = { fn, priority };
        let i = list.length;
        while (i > 0 && list[i - 1].priority < priority) i--;
        list.splice(i, 0, listener);
        this.listeners.set(event, list);

        if (this.debugMode) {
            console.debug(`[EventBus] Listener added for event: ${event}`, { priority });
        }

        return () => this.off(event, fn);
    }

    /**
     * Register a one-time event listener.
     * @param event The event name.
     * @param fn The listener function.
     * @param priority The priority of the listener.
     * @returns A function to unsubscribe the listener.
     */
    once<T = any>(event: string, fn: (payload: T) => any, priority = 0): UnsubscribeFn {
        const wrapper = (payload: T) => {
            this.off(event, wrapper);
            fn(payload);
        };
        this.onceWrappers.set(fn, wrapper);
        this.on(event, wrapper, priority);
        return () => this.off(event, fn);
    }

    /**
     * Remove an event listener.
     * @param event The event name.
     * @param fn The listener function to remove.
     */
    off(event: string, fn: Function): void {
        const list = this.listeners.get(event);
        if (!list) return;
        const wrapper = this.onceWrappers.get(fn) ?? fn;
        this.listeners.set(event, list.filter(l => l.fn !== wrapper));

        if (this.debugMode) {
            console.debug(`[EventBus] Listener removed for event: ${event}`);
        }
    }

    /**
     * Check if there are listeners for a specific event.
     * @param event The event name.
     * @returns True if there are listeners, false otherwise.
     */
    hasListeners(event: string): boolean {
        return event === "any"
            ? this.anyListeners.length > 0
            : (this.listeners.get(event)?.length ?? 0) > 0;
    }

    /**
     * Register a listener for any event.
     * @param fn The listener function.
     * @param priority The priority of the listener.
     * @returns A function to unsubscribe the listener.
     */
    onAny(fn: (event: string, payload: any) => any, priority = 0): UnsubscribeFn {
        const listener: AnyListenerInterface = { fn, priority };
        let i = this.anyListeners.length;
        while (i > 0 && this.anyListeners[i - 1].priority < priority) i--;
        this.anyListeners.splice(i, 0, listener);

        if (this.debugMode) {
            console.debug("[EventBus] Listener added for any event", { priority });
        }

        return () => this.offAny(fn);
    }

    /**
     * Remove a listener for any event.
     * @param fn The listener function to remove.
     */
    offAny(fn: Function): void {
        this.anyListeners = this.anyListeners.filter(l => l.fn !== fn);

        if (this.debugMode) {
            console.debug("[EventBus] Listener removed for any event");
        }
    }

    /**
     * Emit an event to all registered listeners.
     * @param event The event name.
     * @param payload The event payload.
     */
    emit<T = any>(event: string, payload?: T): void {
        if (!event) {
            this._handleError("Event name is undefined or empty", new Error());
            return;
        }

        if (this.debugMode) {
            console.debug(`[EventBus] Emitting event: ${event}`, payload);
        }

        const list = [...(this.listeners.get(event) ?? [])];
        for (const l of list) {
            try {
                l.fn(payload);
            } catch (err) {
                this._handleError(`Error in listener for "${event}"`, err);
            }
        }

        const anyList = [...this.anyListeners];
        for (const l of anyList) {
            try {
                l.fn(event, payload);
            } catch (err) {
                this._handleError(`Error in any-listener for "${event}"`, err);
            }
        }
    }

    /**
     * Emit an event asynchronously to all registered listeners.
     * @param event The event name.
     * @param payload The event payload.
     * @returns A promise that resolves with the results of all listeners.
     */
    async emitAsync<T = any>(event: string, payload?: T): Promise<any[]> {
        if (!event) {
            this._handleError("Event name is undefined or empty", new Error());
            return [];
        }

        const results: any[] = [];
        const list = [...(this.listeners.get(event) ?? [])];
        for (const l of list) {
            try {
                results.push(await l.fn(payload));
            } catch (err) {
                this._handleError(`Async error in listener for "${event}"`, err);
            }
        }

        const anyList = [...this.anyListeners];
        for (const l of anyList) {
            try {
                results.push(await l.fn(event, payload));
            } catch (err) {
                this._handleError(`Async error in any-listener for "${event}"`, err);
            }
        }

        return results;
    }

    /**
     * Remove all listeners for a specific event or all events.
     * @param event The event name. If omitted, all listeners are removed.
     */
    removeAllListeners(event?: string): void {
        if (!event) {
            this.listeners.clear();
            this.anyListeners = [];
        } else if (event === "any") {
            this.anyListeners = [];
        } else {
            this.listeners.delete(event);
        }

        if (this.debugMode) {
            console.debug(`[EventBus] All listeners removed for event: ${event ?? "all"}`);
        }
    }

    /**
     * Get the number of listeners for a specific event.
     * @param event The event name.
     * @returns The number of listeners.
     */
    listenerCount(event: string): number {
        return event === "any"
            ? this.anyListeners.length
            : (this.listeners.get(event)?.length ?? 0);
    }

    /**
     * Get the names of all events with registered listeners.
     * @returns An array of event names.
     */
    eventNames(): string[] {
        return Array.from(this.listeners.keys()).filter(event => (this.listeners.get(event)?.length ?? 0) > 0);
    }

    /**
     * Get all listeners for a specific event.
     * @param event The event name.
     * @returns An array of listener functions.
     */
    getListeners(event: string): Function[] {
        return event === "any"
            ? this.anyListeners.map(l => l.fn)
            : (this.listeners.get(event) ?? []).map(l => l.fn);
    }

    /**
     * Handle errors during event emission.
     * @param message The error message.
     * @param error The error object.
     */
    private _handleError(message: string, error: any): void {
        if (this.emittingError) return;
        this.emittingError = true;

        console.error(`[EventBus] ${message}`, error);

        this.emittingError = false;
    }
}

export const eventBus = new EventBus();
