// src/spaceface/system/bin/EventWatcher.ts

import { eventBus } from "./EventBus.js";
import type { LogPayload } from "../types/bin.js";

type EventTargetLike = EventTarget & {
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void;
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => void;
};

export abstract class EventWatcher {
    protected readonly target: EventTarget;
    protected readonly debug: boolean;
    protected destroyed = false;

    // DOM listeners storage (use Set to avoid duplicates)
    private domListeners = new Set<{
        type: string;
        handler: EventListenerOrEventListenerObject;
        options?: boolean | AddEventListenerOptions;
    }>();

    // To deduplicate log:debug messages
    private loggedMessages = new Set<string>();

    constructor(target: EventTarget, debug: boolean = false) {
        // Use duck-typing so code runs in environments where EventTarget isn't constructible
        const maybeTarget = target as Partial<EventTargetLike>;
        if (!target || typeof maybeTarget.addEventListener !== "function" || typeof maybeTarget.removeEventListener !== "function") {
            throw new Error(`${this.constructor.name}: target must be a valid EventTarget.`);
        }
        this.target = target;
        this.debug = debug;
    }

    /**
     * Centralized logging with support for debug mode.
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
                const logPayload: LogPayload = {
                    scope: this.constructor.name,
                    level,
                    message,
                    data: payload,
                    time: Date.now(),
                };
                eventBus.emit("log", logPayload);
            } catch { /* ignore eventBus errors */ }
            if (this.debug) {
                switch (level) {
                    case 'debug':
                        console.debug(`[${this.constructor.name}] [${level.toUpperCase()}]`, message, payload);
                        break;
                    case 'info':
                        console.info(`[${this.constructor.name}] [${level.toUpperCase()}]`, message, payload);
                        break;
                    case 'warn':
                        console.warn(`[${this.constructor.name}] [${level.toUpperCase()}]`, message, payload);
                        break;
                    case 'error':
                        console.error(`[${this.constructor.name}] [${level.toUpperCase()}]`, message, payload);
                        break;
                }
            }
            return;
        }

        // Backward-compatible form: log(message, data?)
        const message = levelOrMessage as string;
        const payload = messageOrData;
        if (!this.debug) return;
        let logKey: string;
        try {
            logKey = `${message}-${JSON.stringify(payload)}`;
        } catch {
            logKey = `${message}-[unserializable]`;
        }
        if (!this.loggedMessages.has(logKey)) {
            this.loggedMessages.add(logKey);
            try {
                const sanitizedPayload = payload && typeof payload === 'object' ? JSON.parse(JSON.stringify(payload)) : payload;
                const logPayload: LogPayload = {
                    scope: this.constructor.name,
                    level: 'debug',
                    message,
                    data: sanitizedPayload,
                    time: Date.now(),
                };
                eventBus.emit("log:debug", logPayload);
            } catch (error) {
                console.warn("Failed to log debug event", { message, payload, error });
            }
        }
        console.debug(`[${this.constructor.name}] [DEBUG]`, message, payload);
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

    /**
     * Add a DOM listener and store it for later removal.
     */
    protected addDomListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (this.destroyed) return;
        this.target.addEventListener(type, handler, options);
        this.domListeners.add({ type, handler, options });
        if (this.debug) {
            this.log('debug', `Added DOM listener`, { type, handler, options });
        }
    }

    /**
     * Remove all stored DOM listeners.
     */
    protected removeAllDomListeners() {
        for (const { type, handler, options } of this.domListeners) {
            try {
                this.target.removeEventListener(type, handler, options as boolean | EventListenerOptions | undefined);
                if (this.debug) {
                    this.log('debug', `Removed DOM listener`, { type, handler });
                }
            } catch (e) {
                this.log('warn', `Failed to remove DOM listener`, { type, handler, error: e });
            }
        }
        this.domListeners.clear();
    }

    /** Must be implemented by subclasses */
    protected abstract addEventListeners(): void;
    protected abstract removeEventListeners(): void;
}
