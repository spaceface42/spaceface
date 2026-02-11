export const VERSION = '2.0.0';
import { eventBus } from "./EventBus.js";
export class EventWatcher {
    target;
    debug;
    destroyed = false;
    domListeners = new Set();
    loggedMessages = new Set();
    constructor(target, debug = false) {
        if (!target || typeof target.addEventListener !== "function" || typeof target.removeEventListener !== "function") {
            throw new Error(`${this.constructor.name}: target must be a valid EventTarget.`);
        }
        this.target = target;
        this.debug = debug;
    }
    log(levelOrMessage, messageOrData, data) {
        const levels = ['debug', 'info', 'warn', 'error'];
        if (typeof levelOrMessage === 'string' && levels.includes(levelOrMessage) && typeof messageOrData === 'string') {
            const level = levelOrMessage;
            const message = messageOrData;
            const payload = data;
            if (!this.debug && level === 'debug')
                return;
            try {
                const logPayload = {
                    scope: this.constructor.name,
                    level,
                    message,
                    data: payload,
                    time: Date.now(),
                };
                eventBus.emit("log", logPayload);
            }
            catch (_) { }
            if (this.debug) {
                const method = { debug: 'debug', info: 'info', warn: 'warn', error: 'error' }[level] ?? 'log';
                console[method](`[${this.constructor.name}] [${level.toUpperCase()}]`, message, payload);
            }
            return;
        }
        const message = levelOrMessage;
        const payload = messageOrData;
        if (!this.debug)
            return;
        let logKey;
        try {
            logKey = `${message}-${JSON.stringify(payload)}`;
        }
        catch {
            logKey = `${message}-[unserializable]`;
        }
        if (!this.loggedMessages.has(logKey)) {
            this.loggedMessages.add(logKey);
            try {
                const sanitizedPayload = payload && typeof payload === 'object' ? JSON.parse(JSON.stringify(payload)) : payload;
                const logPayload = {
                    scope: this.constructor.name,
                    level: 'debug',
                    message,
                    data: sanitizedPayload,
                    time: Date.now(),
                };
                eventBus.emit("log:debug", logPayload);
            }
            catch (error) {
                console.warn("Failed to log debug event", { message, payload, error });
            }
        }
        console.debug?.(`[${this.constructor.name}] [DEBUG]`, message, payload);
    }
    checkDestroyed() {
        if (this.destroyed) {
            throw new Error(`${this.constructor.name} has been destroyed.`);
        }
    }
    destroy() {
        if (this.destroyed)
            return;
        this.log('info', "Destroying watcher");
        try {
            this.removeAllDomListeners();
            this.removeEventListeners();
        }
        catch (err) {
            this.log('error', "Error while destroying watcher", err);
        }
        finally {
            this.destroyed = true;
        }
    }
    addDomListener(type, handler, options) {
        if (this.destroyed)
            return;
        this.target.addEventListener(type, handler, options);
        this.domListeners.add({ type, handler, options });
        if (this.debug) {
            this.log('debug', `Added DOM listener`, { type, handler, options });
        }
    }
    removeAllDomListeners() {
        for (const { type, handler, options } of this.domListeners) {
            try {
                this.target.removeEventListener(type, handler, options);
                if (this.debug) {
                    this.log('debug', `Removed DOM listener`, { type, handler });
                }
            }
            catch (e) {
                this.log('warn', `Failed to remove DOM listener`, { type, handler, error: e });
            }
        }
        this.domListeners.clear();
    }
}
//# sourceMappingURL=EventWatcher.js.map