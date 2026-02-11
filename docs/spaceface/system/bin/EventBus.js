export const VERSION = 'nextworld-1.3.0';
export class EventBus {
    listeners = new Map();
    anyListeners = [];
    onceWrappers = new WeakMap();
    emittingError = false;
    debugMode = false;
    setDebugMode(enable) {
        this.debugMode = enable;
        if (this.debugMode) {
            console.debug("[EventBus] Debug mode enabled");
        }
    }
    on(event, fn, priority = 0) {
        const list = this.listeners.get(event) ?? [];
        const listener = { fn, priority };
        let i = list.length;
        while (i > 0 && list[i - 1].priority < priority)
            i--;
        list.splice(i, 0, listener);
        this.listeners.set(event, list);
        if (this.debugMode) {
            console.debug(`[EventBus] Listener added for event: ${event}`, { priority });
        }
        return () => this.off(event, fn);
    }
    once(event, fn, priority = 0) {
        const wrapper = (payload) => {
            this.off(event, wrapper);
            fn(payload);
        };
        this.onceWrappers.set(fn, wrapper);
        this.on(event, wrapper, priority);
        return () => this.off(event, fn);
    }
    off(event, fn) {
        const list = this.listeners.get(event);
        if (!list)
            return;
        const wrapper = this.onceWrappers.get(fn) ?? fn;
        this.listeners.set(event, list.filter(l => l.fn !== wrapper));
        if (this.debugMode) {
            console.debug(`[EventBus] Listener removed for event: ${event}`);
        }
    }
    hasListeners(event) {
        return event === "any"
            ? this.anyListeners.length > 0
            : (this.listeners.get(event)?.length ?? 0) > 0;
    }
    onAny(fn, priority = 0) {
        const listener = { fn, priority };
        let i = this.anyListeners.length;
        while (i > 0 && this.anyListeners[i - 1].priority < priority)
            i--;
        this.anyListeners.splice(i, 0, listener);
        if (this.debugMode) {
            console.debug("[EventBus] Listener added for any event", { priority });
        }
        return () => this.offAny(fn);
    }
    offAny(fn) {
        this.anyListeners = this.anyListeners.filter(l => l.fn !== fn);
        if (this.debugMode) {
            console.debug("[EventBus] Listener removed for any event");
        }
    }
    emit(event, payload) {
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
            }
            catch (err) {
                this._handleError(`Error in listener for "${event}"`, err);
            }
        }
        const anyList = [...this.anyListeners];
        for (const l of anyList) {
            try {
                l.fn(event, payload);
            }
            catch (err) {
                this._handleError(`Error in any-listener for "${event}"`, err);
            }
        }
    }
    async emitAsync(event, payload) {
        if (!event) {
            this._handleError("Event name is undefined or empty", new Error());
            return [];
        }
        const results = [];
        const list = [...(this.listeners.get(event) ?? [])];
        for (const l of list) {
            try {
                results.push(await l.fn(payload));
            }
            catch (err) {
                this._handleError(`Async error in listener for "${event}"`, err);
            }
        }
        const anyList = [...this.anyListeners];
        for (const l of anyList) {
            try {
                results.push(await l.fn(event, payload));
            }
            catch (err) {
                this._handleError(`Async error in any-listener for "${event}"`, err);
            }
        }
        return results;
    }
    removeAllListeners(event) {
        if (!event) {
            this.listeners.clear();
            this.anyListeners = [];
        }
        else if (event === "any") {
            this.anyListeners = [];
        }
        else {
            this.listeners.delete(event);
        }
        if (this.debugMode) {
            console.debug(`[EventBus] All listeners removed for event: ${event ?? "all"}`);
        }
    }
    listenerCount(event) {
        return event === "any"
            ? this.anyListeners.length
            : (this.listeners.get(event)?.length ?? 0);
    }
    eventNames() {
        return Array.from(this.listeners.keys()).filter(event => (this.listeners.get(event)?.length ?? 0) > 0);
    }
    getListeners(event) {
        return event === "any"
            ? this.anyListeners.map(l => l.fn)
            : (this.listeners.get(event) ?? []).map(l => l.fn);
    }
    _handleError(message, error) {
        if (this.emittingError)
            return;
        this.emittingError = true;
        console.error(`[EventBus] ${message}`, error);
        this.emittingError = false;
    }
}
export const eventBus = new EventBus();
//# sourceMappingURL=EventBus.js.map