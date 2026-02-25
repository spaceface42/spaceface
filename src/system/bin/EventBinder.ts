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

import {
  DomBinding,
  EventBinderStats,
  EventBinderInterface,
  BusBindingInterface
} from "../types/bin.js";

import { eventBus } from "./EventBus.js";
import { EventLogger } from "./EventLogger.js";

interface IEventBinderDebugPayload {
  method: string;
  details: unknown;
}

type EventTargetLike = EventTarget & {
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => void;
};

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
  private logger: EventLogger;

  /**
   * Create a new EventBinder.
   * @param debug Enable debug logging (emits `debug:EventBinder` events)
   */
  constructor(debug = false) {
    this.debugMode = debug;
    this.logger = new EventLogger("eventbinder");
  }

  /**
   * Emit debug info via EventBus if debug mode is enabled.
   * @param method The method name where the debug is called.
   * @param details Additional details to log.
   */
  private debug(method: string, details: unknown): void {
    if (!this.debugMode) return;
    try {
      const payload: IEventBinderDebugPayload = { method, details };
      this.logger.debug(method, payload);
    } catch (error) {
      console.error(`Debugging failed in method: ${method}`, error);
    }
  }

  /**
   * Attach binder lifetime to an AbortSignal.
   * All bindings will be unbound automatically when the signal aborts.
   * @param signal AbortSignal to link binder lifetime to.
   * @returns Unsubscribe function that removes the abort listener.
   */
  attachTo(signal: AbortSignal): () => void {
    if (signal.aborted) {
      this.unbindAll();
      return () => {};
    }
    const listener = () => this.unbindAll();
    signal.addEventListener("abort", listener, { once: true });
    // return an unsubscribe so callers (eg tests) can remove the attachment without aborting the signal
    return () => {
      try {
        signal.removeEventListener("abort", listener);
      } catch (error) {
        console.warn("Failed to remove abort listener", error);
      }
    };
  }

  /**
   * Toggle debug mode at runtime.
   * @param enable Set to true to enable debug mode, false to disable.
   */
  public setDebugMode(enable: boolean): void {
    this.debugMode = enable;
    this.logger.info(`Debug mode ${enable ? 'enabled' : 'disabled'}`);
  }

  /**
   * Bind a handler to an EventBus event.
   * @param event Event name
   * @param handler Event handler function
   */
  bindBus(event: string, handler: (...args: unknown[]) => void): void {
    if (this.IBusBindings.find(b => b.event === event && b.handler === handler)) {
      this.debug("bus:bind:duplicate", { event, handler });
      return;
    }
    try {
      const unsubscribe = eventBus.on(event, handler);
      this.IBusBindings.push({ event, handler, unsubscribe });
      this.debug("bus:bind", { event, handler });
    } catch (err) {
      this.logger.error(`Failed to bind bus event "${event}": ${err instanceof Error ? err.message : String(err)}`);
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
    // Duck-typing check so this works in non-browser/test runtimes where EventTarget instanceof may fail
    const maybeTarget = target as Partial<EventTargetLike>;
    if (!target || typeof maybeTarget.addEventListener !== "function" || typeof maybeTarget.removeEventListener !== "function") {
      this.logger.warn(`Invalid DOM target for bindDOM: ${String(target)}`);
      return;
    }

    const controller = new AbortController();
    const normalizedOptions: AddEventListenerOptions =
      typeof options === "boolean"
        ? { capture: options, signal: controller.signal }
        : { ...options, signal: controller.signal };

    // simple options equality (compare capture/passive/once) to avoid duplicate bindings with identical semantics
    const optionsEqual = (a?: AddEventListenerOptions, b?: AddEventListenerOptions) =>
      (!!a === !!b) &&
      ((a?.capture ?? false) === (b?.capture ?? false)) &&
      ((a?.passive ?? false) === (b?.passive ?? false)) &&
      ((a?.once ?? false) === (b?.once ?? false));

    if (this.domBindings.find(b => b.target === target && b.event === event && b.handler === handler && optionsEqual(b.options, normalizedOptions))) {
      this.debug("dom:bind:duplicate", { event, handler, target, options: normalizedOptions });
      return;
    }

    try {
      (target as EventTargetLike).addEventListener(event, handler, normalizedOptions);
      this.domBindings.push({ target, event, handler, options: normalizedOptions, controller });
      this.debug("dom:bind", { event, handler, target, options: normalizedOptions });
    } catch (err) {
      this.logger.error(`Failed to bind DOM event "${event}": ${err instanceof Error ? err.message : String(err)}`);
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
        this.logger.error(`Failed to unbind bus "${b.event}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    for (const b of this.domBindings) {
      try {
        b.controller.abort();
        this.debug("dom:unbind", { event: b.event, target: b.target });
      } catch (err) {
        this.logger.error(`Failed to unbind DOM "${b.event}": ${err instanceof Error ? err.message : String(err)}`);
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
  unbindBus(event: string, handler: (...args: unknown[]) => void): boolean {
    const i = this.IBusBindings.findIndex(b => b.event === event && b.handler === handler);
    if (i === -1) return false;

    try {
      this.IBusBindings[i].unsubscribe();
      this.IBusBindings.splice(i, 1);
      this.debug("bus:unbind:single", { event, handler });
      return true;
    } catch (err) {
      this.logger.error(`Failed to unbind bus "${event}": ${err instanceof Error ? err.message : String(err)}`);
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
      this.logger.error(`Failed to unbind DOM "${event}": ${err instanceof Error ? err.message : String(err)}`);
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
