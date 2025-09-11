// src/spaceface/system/bin/EventBinder.ts

/**
 * EventBinder v1.2.2
 *
 * Manages the lifecycle of EventBus and DOM event bindings with
 * support for auto-unbinding, debugging, and scoped lifetimes.
 *
 * Provides a single utility class for safely attaching and
 * detaching event handlers in a structured way.
 */
export const VERSION = 'nextworld-1.2.2' as const;

import {
  DomBinding,
  EventBinderStats,
  EventBinderInterface,
  BusBindingInterface
} from "../types/bin.js";

import { eventBus } from "./EventBus.js";

interface IEventBinderDebugPayload {
  method: string;
  details: unknown;
}

/**
 * EventBinder
 *
 * A utility for managing event bindings across EventBus and DOM.
 * Keeps track of all active bindings and supports automatic cleanup.
 */
export class EventBinder implements EventBinderInterface {
  private IBusBindings: BusBindingInterface[] = [];
  private domBindings: DomBinding[] = [];
  private debugMode: boolean;

  /**
   * Create a new EventBinder.
   * @param debug Enable debug logging (emits `debug:EventBinder` events)
   */
  constructor(debug = false) {
    this.debugMode = debug;
  }

    /** Emit debug info via EventBus if debug mode is enabled */
    private debug(method: string, details: unknown): void {
        if (!this.debugMode) return;
        try {
            const payload: IEventBinderDebugPayload = { method, details };
            eventBus.emit<IEventBinderDebugPayload>("debug:EventBinder", payload);
        } catch {
            // ignore debug errors
        }
    }

    /**
     * Attach binder lifetime to an AbortSignal.
     * All bindings will be unbound automatically when the signal aborts.
     * @param signal AbortSignal to link binder lifetime to
     */
    attachTo(signal: AbortSignal): void {
        if (signal.aborted) {
            this.unbindAll();
            return;
        }
        const listener = () => this.unbindAll();
        signal.addEventListener("abort", listener, { once: true });
    }

    /**
     * Bind a handler to an EventBus event.
     * @param event Event name
     * @param handler Event handler function
     */
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

    /**
     * Bind a DOM event handler with automatic tracking and unbind support.
     * @param target Target element or EventTarget
     * @param event Event name
     * @param handler Event listener
     * @param options Optional event listener options
     */
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

    /**
     * Unbind all EventBus and DOM event handlers managed by this binder.
     */
    unbindAll(): void {
        this.debug("unbindAll", {
            bus: this.IBusBindings.length,
            dom: this.domBindings.length,
        });

        for (const b of this.IBusBindings) {
            try {
                b.unsubscribe();
                this.debug("bus:unbind", { event: b.event });
            } catch (err) {
                console.error(`EventBinder: Failed to unbind bus "${b.event}"`, err);
            }
        }

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

    /**
     * Unbind a specific EventBus handler.
     * @param event Event name
     * @param handler Event handler
     * @returns True if successfully unbound, false otherwise
     */
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

    /**
     * Unbind a specific DOM event handler.
     * @param target Target element
     * @param event Event name
     * @param handler Event listener
     * @returns True if successfully unbound, false otherwise
     */
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

    /**
     * Get binding statistics.
     * @returns Number of bus and DOM events currently bound
     */
    getStats(): EventBinderStats {
        return {
            busEvents: this.IBusBindings.length,
            domEvents: this.domBindings.length,
            totalEvents: this.IBusBindings.length + this.domBindings.length,
        };
    }

    /**
     * Check if there are any active bindings.
     * @returns True if any EventBus or DOM bindings exist
     */
    hasBindings(): boolean {
        return this.IBusBindings.length > 0 || this.domBindings.length > 0;
    }

    /**
     * Get details of all active bindings.
     * @returns Object with arrays of bus and DOM binding info
     */
    getBindingDetails(): { bus: string[]; dom: string[] } {
        return {
            bus: this.IBusBindings.map(b => b.event),
            dom: this.domBindings.map(b => `${b.event}@${b.target.constructor.name}`),
        };
    }

    /**
     * Utility wrapper for scoped binding lifetimes.
     * Automatically unbinds after callback execution (sync or async).
     *
     * @param callback Function that receives a temporary EventBinder
     * @param debug Enable debug mode
     * @returns The callback result
     */
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

/** Default shared EventBinder instance */
export const eventBinder = new EventBinder();
