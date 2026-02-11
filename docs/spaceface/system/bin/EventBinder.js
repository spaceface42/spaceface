export const VERSION = '2.0.0';
import { eventBus } from "./EventBus.js";
import { EventLogger } from "./EventLogger.js";
export class EventBinder {
    IBusBindings = [];
    domBindings = [];
    debugMode;
    logger;
    constructor(debug = false) {
        this.debugMode = debug;
        this.logger = new EventLogger("eventbinder");
    }
    debug(method, details) {
        if (!this.debugMode)
            return;
        try {
            const payload = { method, details };
            this.logger.debug(method, payload);
        }
        catch (error) {
            console.error(`Debugging failed in method: ${method}`, error);
        }
    }
    attachTo(signal) {
        if (signal.aborted) {
            this.unbindAll();
            return () => { };
        }
        const listener = () => this.unbindAll();
        signal.addEventListener("abort", listener, { once: true });
        return () => {
            try {
                signal.removeEventListener("abort", listener);
            }
            catch (error) {
                console.warn("Failed to remove abort listener", error);
            }
        };
    }
    setDebugMode(enable) {
        this.debugMode = enable;
        this.logger.info(`Debug mode ${enable ? 'enabled' : 'disabled'}`);
    }
    bindBus(event, handler) {
        if (this.IBusBindings.find(b => b.event === event && b.handler === handler)) {
            this.debug("bus:bind:duplicate", { event, handler });
            return;
        }
        try {
            const unsubscribe = eventBus.on(event, handler);
            this.IBusBindings.push({ event, handler, unsubscribe });
            this.debug("bus:bind", { event, handler });
        }
        catch (err) {
            this.logger.error(`Failed to bind bus event "${event}": ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    bindDOM(target, event, handler, options = false) {
        if (!target || typeof target.addEventListener !== "function" || typeof target.removeEventListener !== "function") {
            this.logger.warn(`Invalid DOM target for bindDOM: ${String(target)}`);
            return;
        }
        const controller = new AbortController();
        const normalizedOptions = typeof options === "boolean"
            ? { capture: options, signal: controller.signal }
            : { ...options, signal: controller.signal };
        const optionsEqual = (a, b) => (!!a === !!b) &&
            ((a?.capture ?? false) === (b?.capture ?? false)) &&
            ((a?.passive ?? false) === (b?.passive ?? false)) &&
            ((a?.once ?? false) === (b?.once ?? false));
        if (this.domBindings.find(b => b.target === target && b.event === event && b.handler === handler && optionsEqual(b.options, normalizedOptions))) {
            this.debug("dom:bind:duplicate", { event, handler, target, options: normalizedOptions });
            return;
        }
        try {
            target.addEventListener(event, handler, normalizedOptions);
            this.domBindings.push({ target, event, handler, options: normalizedOptions, controller });
            this.debug("dom:bind", { event, handler, target, options: normalizedOptions });
        }
        catch (err) {
            this.logger.error(`Failed to bind DOM event "${event}": ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    unbindAll() {
        this.debug("unbindAll", {
            bus: this.IBusBindings.length,
            dom: this.domBindings.length,
        });
        for (const b of this.IBusBindings) {
            try {
                b.unsubscribe();
                this.debug("bus:unbind", { event: b.event });
            }
            catch (err) {
                this.logger.error(`Failed to unbind bus "${b.event}": ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        for (const b of this.domBindings) {
            try {
                b.controller.abort();
                this.debug("dom:unbind", { event: b.event, target: b.target });
            }
            catch (err) {
                this.logger.error(`Failed to unbind DOM "${b.event}": ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        this.IBusBindings = [];
        this.domBindings = [];
    }
    unbindBus(event, handler) {
        const i = this.IBusBindings.findIndex(b => b.event === event && b.handler === handler);
        if (i === -1)
            return false;
        try {
            this.IBusBindings[i].unsubscribe();
            this.IBusBindings.splice(i, 1);
            this.debug("bus:unbind:single", { event, handler });
            return true;
        }
        catch (err) {
            this.logger.error(`Failed to unbind bus "${event}": ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    }
    unbindDOM(target, event, handler) {
        const i = this.domBindings.findIndex(b => b.target === target && b.event === event && b.handler === handler);
        if (i === -1)
            return false;
        try {
            this.domBindings[i].controller.abort();
            this.domBindings.splice(i, 1);
            this.debug("dom:unbind:single", { event, target });
            return true;
        }
        catch (err) {
            this.logger.error(`Failed to unbind DOM "${event}": ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    }
    getStats() {
        return {
            busEvents: this.IBusBindings.length,
            domEvents: this.domBindings.length,
            totalEvents: this.IBusBindings.length + this.domBindings.length,
        };
    }
    hasBindings() {
        return this.IBusBindings.length > 0 || this.domBindings.length > 0;
    }
    getBindingDetails() {
        return {
            bus: this.IBusBindings.map(b => b.event),
            dom: this.domBindings.map(b => `${b.event}@${b.target.constructor.name}`),
        };
    }
    static withAutoUnbind(callback, debug = false) {
        const binder = new EventBinder(debug);
        try {
            const result = callback(binder);
            if (result instanceof Promise) {
                return result.finally(() => binder.unbindAll());
            }
            else {
                binder.unbindAll();
                return result;
            }
        }
        catch (err) {
            binder.unbindAll();
            throw err;
        }
    }
}
export const eventBinder = new EventBinder();
//# sourceMappingURL=EventBinder.js.map