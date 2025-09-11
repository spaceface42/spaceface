// src/spaceface/system/bin/EventBinder.ts

export const VERSION = 'nextworld-1.2.2';

import {
  DomBinding,
  EventBinderStats,
  IEventBinder,
  IBusBinding
} from "../types/bin.js";

import { eventBus } from "./EventBus.js";

interface IEventBinderDebugPayload {
  method: string;
  details: unknown;
}

export class EventBinder implements IEventBinder {
  private IBusBindings: IBusBinding[] = [];
  private domBindings: DomBinding[] = [];
  private debugMode: boolean;

  constructor(debug = false) {
    this.debugMode = debug;
  }

    /** Debug helper */
    private debug(method: string, details: unknown): void {
        if (!this.debugMode) return;
        try {
            const payload: IEventBinderDebugPayload = { method, details };
            eventBus.emit<IEventBinderDebugPayload>("debug:EventBinder", payload);
        } catch {
            // ignore debug errors
        }
    }

    /** Attach binder lifetime to external AbortSignal (auto-unbind on abort) */
    attachTo(signal: AbortSignal): void {
        if (signal.aborted) {
            this.unbindAll();
            return;
        }
        const listener = () => this.unbindAll();
        signal.addEventListener("abort", listener, { once: true });
    }

    /** Bind EventBus event */
    bindBus(event: string, handler: (...args: any[]) => void): void {
        if (this.IBusBindings.find(b => b.event === event && b.handler === handler)) {
            this.debug("bus:bind:duplicate", { event, handler });
            return;
        }
        try {
            const unsubscribe = eventBus.on(event, handler);
            this.IBusBindings.push({ event, handler, unsubscribe });
            this.debug("bus:bind", { event, handler });
        } catch (err) {
            console.error(`EventBinder: Failed to bind bus event "${event}"`, err);
        }
    }

    /** Bind DOM event */
    bindDOM(
        target: EventTarget,
        event: string,
        handler: EventListenerOrEventListenerObject,
        options: AddEventListenerOptions | boolean = false
    ): void {
        if (!(target instanceof EventTarget)) {
            console.warn("EventBinder: Invalid DOM target", target);
            return;
        }

        if (this.domBindings.find(b => b.target === target && b.event === event && b.handler === handler)) {
            this.debug("dom:bind:duplicate", { event, handler, target });
            return;
        }

        const controller = new AbortController();
        const normalizedOptions: AddEventListenerOptions =
            typeof options === "boolean"
                ? { capture: options, signal: controller.signal }
                : { ...options, signal: controller.signal };

        try {
            target.addEventListener(event, handler, normalizedOptions);
            this.domBindings.push({ target, event, handler, options: normalizedOptions, controller });
            this.debug("dom:bind", { event, handler, target });
        } catch (err) {
            console.error(`EventBinder: Failed to bind DOM event "${event}"`, err);
        }
    }

    /** Unbind everything */
    unbindAll(): void {
        this.debug("unbindAll", {
            bus: this.IBusBindings.length,
            dom: this.domBindings.length,
        });

        // EventBus
        for (const b of this.IBusBindings) {
            try {
                b.unsubscribe();
                this.debug("bus:unbind", { event: b.event });
            } catch (err) {
                console.error(`EventBinder: Failed to unbind bus "${b.event}"`, err);
            }
        }

        // DOM
        for (const b of this.domBindings) {
            try {
                b.controller.abort();
                this.debug("dom:unbind", { event: b.event, target: b.target });
            } catch (err) {
                console.error(`EventBinder: Failed to unbind DOM "${b.event}"`, err);
            }
        }

        this.IBusBindings = [];
        this.domBindings = [];
    }

    /** Unbind specific EventBus handler */
    unbindBus(event: string, handler: (...args: any[]) => void): boolean {
        const i = this.IBusBindings.findIndex(b => b.event === event && b.handler === handler);
        if (i === -1) return false;

        try {
            this.IBusBindings[i].unsubscribe();
            this.IBusBindings.splice(i, 1);
            this.debug("bus:unbind:single", { event, handler });
            return true;
        } catch (err) {
            console.error(`EventBinder: Failed to unbind bus "${event}"`, err);
            return false;
        }
    }

    /** Unbind specific DOM handler */
    unbindDOM(target: EventTarget, event: string, handler: EventListenerOrEventListenerObject): boolean {
        const i = this.domBindings.findIndex(b => b.target === target && b.event === event && b.handler === handler);
        if (i === -1) return false;

        try {
            this.domBindings[i].controller.abort();
            this.domBindings.splice(i, 1);
            this.debug("dom:unbind:single", { event, target });
            return true;
        } catch (err) {
            console.error(`EventBinder: Failed to unbind DOM "${event}"`, err);
            return false;
        }
    }

    /** Stats */
    getStats(): EventBinderStats {
        return {
            busEvents: this.IBusBindings.length,
            domEvents: this.domBindings.length,
            totalEvents: this.IBusBindings.length + this.domBindings.length,
        };
    }

    /** Are there any bindings? */
    hasBindings(): boolean {
        return this.IBusBindings.length > 0 || this.domBindings.length > 0;
    }

    /** Details for debugging */
    getBindingDetails(): { bus: string[]; dom: string[] } {
        return {
            bus: this.IBusBindings.map(b => b.event),
            dom: this.domBindings.map(b => `${b.event}@${b.target.constructor.name}`),
        };
    }

    /** Auto-unbind wrapper */
    static withAutoUnbind<T>(
        callback: (binder: EventBinder) => T | Promise<T>,
        debug = false
    ): Promise<T> | T {
        const binder = new EventBinder(debug);
        try {
            const result = callback(binder);
            if (result instanceof Promise) {
                return result.finally(() => binder.unbindAll());
            } else {
                binder.unbindAll();
                return result;
            }
        } catch (err) {
            binder.unbindAll();
            throw err;
        }
    }
}

export const eventBinder = new EventBinder();
