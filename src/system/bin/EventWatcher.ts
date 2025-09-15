// src/spaceface/system/bin/EventWatcher.ts
export const VERSION = 'nextworld-1.2.0' as const;

import { eventBus } from "./EventBus.js";

export abstract class EventWatcher {
    protected readonly target: EventTarget;
    protected readonly debug: boolean;
    protected listening = false;
    protected destroyed = false;

    // DOM listeners storage
    private domListeners: { type: string; handler: EventListenerOrEventListenerObject }[] = [];

    constructor(target: EventTarget, debug: boolean = false) {
        if (!(target instanceof EventTarget)) {
            throw new Error(`${this.constructor.name}: target must be a valid EventTarget.`);
        }
        this.target = target;
        this.debug = debug;
    }

    /** Centralized logging via eventBus */
    protected log(message: string, data?: unknown) {
        if (this.debug) {
            eventBus.emit("log:debug", {
                scope: this.constructor.name,
                message,
                data,
            });
        }
    }

    protected checkDestroyed() {
        if (this.destroyed) {
            throw new Error(`${this.constructor.name} has been destroyed.`);
        }
    }

    public destroy() {
        if (this.destroyed) return;
        this.log("Destroying watcher");
        try {
            this.removeAllDomListeners();
            this.removeEventListeners();
        } finally {
            this.destroyed = true;
        }
    }

    /** Add a DOM listener and store it for later removal */
    protected addDomListener(type: string, handler: EventListenerOrEventListenerObject) {
        this.target.addEventListener(type, handler);
        this.domListeners.push({ type, handler });
    }

    /** Remove all stored DOM listeners */
    protected removeAllDomListeners() {
        for (const { type, handler } of this.domListeners) {
            this.target.removeEventListener(type, handler);
        }
        this.domListeners = [];
    }

    /** Must be implemented by subclasses */
    protected abstract addEventListeners(): void;
    protected abstract removeEventListeners(): void;
}
