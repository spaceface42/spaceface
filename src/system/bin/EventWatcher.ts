// src/spaceface/system/bin/EventWatcher.ts
export const VERSION = 'nextworld-1.2.0' as const;

import { eventBus } from "./EventBus.js";

export abstract class EventWatcher {
    protected readonly target: EventTarget;
    protected readonly debug: boolean;
    protected destroyed = false;

    // DOM listeners storage (store options so removal is exact)
    private domListeners: { type: string; handler: EventListenerOrEventListenerObject; options?: boolean | AddEventListenerOptions }[] = [];

    constructor(target: EventTarget, debug: boolean = false) {
        // Use duck-typing so code runs in environments where EventTarget isn't constructible
        if (!target || typeof (target as any).addEventListener !== "function" || typeof (target as any).removeEventListener !== "function") {
            throw new Error(`${this.constructor.name}: target must be a valid EventTarget.`);
        }
        this.target = target;
        this.debug = debug;
    }

    /**
     * Centralized logging.
     *
     * Supports two call forms for backward compatibility:
     *  - log(level, message, data?)
     *  - log(message, data?)        // treated as debug-level (legacy)
     */
    protected log(levelOrMessage: 'debug' | 'info' | 'warn' | 'error' | string, messageOrData?: unknown, data?: unknown) {
        // If first arg is a recognized level and second arg is a string -> new form
        const levels = ['debug', 'info', 'warn', 'error'];
        if (typeof levelOrMessage === 'string' && levels.includes(levelOrMessage) && typeof messageOrData === 'string') {
            const level = levelOrMessage as 'debug' | 'info' | 'warn' | 'error';
            const message = messageOrData as string;
            const payload = data;
            if (!this.debug && level === 'debug') return;
            try {
                eventBus.emit("log", { scope: this.constructor.name, level, message, data: payload });
            } catch (_) { /* ignore eventBus errors */ }
            if (this.debug) {
                const method = { debug: 'debug', info: 'info', warn: 'warn', error: 'error' }[level] ?? 'log';
                (console as any)[method](`[${this.constructor.name}] [${level.toUpperCase()}]`, message, payload);
            }
            return;
        }

        // Backward-compatible form: log(message, data?)
        const message = levelOrMessage as string;
        const payload = messageOrData;
        if (!this.debug) return;
        try {
            eventBus.emit("log:debug", {
                scope: this.constructor.name,
                message,
                data: payload,
            });
        } catch (_) { /* ignore eventBus errors */ }
        (console as any).debug?.(`[${this.constructor.name}] [DEBUG]`, message, payload);
    }

    protected checkDestroyed() {
        if (this.destroyed) {
            throw new Error(`${this.constructor.name} has been destroyed.`);
        }
    }

    public destroy() {
        if (this.destroyed) return;
        this.log('info', "Destroying watcher");
        try {
            this.removeAllDomListeners();
            this.removeEventListeners();
        } catch (err) {
            // ensure we mark destroyed and surface debug info without throwing
            this.log('error', "Error while destroying watcher", err);
        } finally {
            this.destroyed = true;
        }
    }

    /** Add a DOM listener and store it for later removal */
    protected addDomListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (this.destroyed) return;
        this.target.addEventListener(type, handler, options);
        this.domListeners.push({ type, handler, options });
    }

    /** Remove all stored DOM listeners */
    protected removeAllDomListeners() {
        for (const { type, handler, options } of this.domListeners) {
            try {
                // removeEventListener accepts the same boolean/options used to add the listener
                this.target.removeEventListener(type, handler, options as any);
            } catch (e) {
                // ignore errors during cleanup
            }
        }
        this.domListeners = [];
    }

    /** Must be implemented by subclasses */
    protected abstract addEventListeners(): void;
    protected abstract removeEventListeners(): void;
}
