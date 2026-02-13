var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/system/bin/EventBus.ts
var EventBus, eventBus;
var init_EventBus = __esm({
  "src/system/bin/EventBus.ts"() {
    "use strict";
    EventBus = class {
      listeners = /* @__PURE__ */ new Map();
      anyListeners = [];
      onceWrappers = /* @__PURE__ */ new WeakMap();
      emittingError = false;
      debugMode = false;
      // Debug mode flag
      /**
       * Enable or disable debug mode.
       * @param enable Set to true to enable debug mode, false to disable.
       */
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
        while (i > 0 && list[i - 1].priority < priority) i--;
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
      /**
       * Remove an event listener.
       * @param event The event name.
       * @param fn The listener function to remove.
       */
      off(event, fn) {
        const list = this.listeners.get(event);
        if (!list) return;
        const wrapper = this.onceWrappers.get(fn) ?? fn;
        this.listeners.set(event, list.filter((l) => l.fn !== wrapper));
        if (this.debugMode) {
          console.debug(`[EventBus] Listener removed for event: ${event}`);
        }
      }
      /**
       * Check if there are listeners for a specific event.
       * @param event The event name.
       * @returns True if there are listeners, false otherwise.
       */
      hasListeners(event) {
        return event === "any" ? this.anyListeners.length > 0 : (this.listeners.get(event)?.length ?? 0) > 0;
      }
      /**
       * Register a listener for any event.
       * @param fn The listener function.
       * @param priority The priority of the listener.
       * @returns A function to unsubscribe the listener.
       */
      onAny(fn, priority = 0) {
        const listener = { fn, priority };
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
      offAny(fn) {
        this.anyListeners = this.anyListeners.filter((l) => l.fn !== fn);
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
        const list = [...this.listeners.get(event) ?? []];
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
      async emitAsync(event, payload) {
        if (!event) {
          this._handleError("Event name is undefined or empty", new Error());
          return [];
        }
        const results = [];
        const list = [...this.listeners.get(event) ?? []];
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
      removeAllListeners(event) {
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
      listenerCount(event) {
        return event === "any" ? this.anyListeners.length : this.listeners.get(event)?.length ?? 0;
      }
      /**
       * Get the names of all events with registered listeners.
       * @returns An array of event names.
       */
      eventNames() {
        return Array.from(this.listeners.keys()).filter((event) => (this.listeners.get(event)?.length ?? 0) > 0);
      }
      /**
       * Get all listeners for a specific event.
       * @param event The event name.
       * @returns An array of listener functions.
       */
      getListeners(event) {
        return event === "any" ? this.anyListeners.map((l) => l.fn) : (this.listeners.get(event) ?? []).map((l) => l.fn);
      }
      /**
       * Handle errors during event emission.
       * @param message The error message.
       * @param error The error object.
       */
      _handleError(message, error) {
        if (this.emittingError) return;
        this.emittingError = true;
        console.error(`[EventBus] ${message}`, error);
        this.emittingError = false;
      }
    };
    eventBus = new EventBus();
  }
});

// src/system/bin/EventWatcher.ts
var EventWatcher;
var init_EventWatcher = __esm({
  "src/system/bin/EventWatcher.ts"() {
    "use strict";
    init_EventBus();
    EventWatcher = class {
      target;
      debug;
      destroyed = false;
      // DOM listeners storage (use Set to avoid duplicates)
      domListeners = /* @__PURE__ */ new Set();
      // To deduplicate log:debug messages
      loggedMessages = /* @__PURE__ */ new Set();
      constructor(target, debug = false) {
        if (!target || typeof target.addEventListener !== "function" || typeof target.removeEventListener !== "function") {
          throw new Error(`${this.constructor.name}: target must be a valid EventTarget.`);
        }
        this.target = target;
        this.debug = debug;
      }
      /**
       * Centralized logging with support for debug mode.
       */
      log(levelOrMessage, messageOrData, data) {
        const levels = ["debug", "info", "warn", "error"];
        if (typeof levelOrMessage === "string" && levels.includes(levelOrMessage) && typeof messageOrData === "string") {
          const level = levelOrMessage;
          const message2 = messageOrData;
          const payload2 = data;
          if (!this.debug && level === "debug") return;
          try {
            const logPayload = {
              scope: this.constructor.name,
              level,
              message: message2,
              data: payload2,
              time: Date.now()
            };
            eventBus.emit("log", logPayload);
          } catch (_) {
          }
          if (this.debug) {
            const method = { debug: "debug", info: "info", warn: "warn", error: "error" }[level] ?? "log";
            console[method](`[${this.constructor.name}] [${level.toUpperCase()}]`, message2, payload2);
          }
          return;
        }
        const message = levelOrMessage;
        const payload = messageOrData;
        if (!this.debug) return;
        let logKey;
        try {
          logKey = `${message}-${JSON.stringify(payload)}`;
        } catch {
          logKey = `${message}-[unserializable]`;
        }
        if (!this.loggedMessages.has(logKey)) {
          this.loggedMessages.add(logKey);
          try {
            const sanitizedPayload = payload && typeof payload === "object" ? JSON.parse(JSON.stringify(payload)) : payload;
            const logPayload = {
              scope: this.constructor.name,
              level: "debug",
              message,
              data: sanitizedPayload,
              time: Date.now()
            };
            eventBus.emit("log:debug", logPayload);
          } catch (error) {
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
        if (this.destroyed) return;
        this.log("info", "Destroying watcher");
        try {
          this.removeAllDomListeners();
          this.removeEventListeners();
        } catch (err) {
          this.log("error", "Error while destroying watcher", err);
        } finally {
          this.destroyed = true;
        }
      }
      /**
       * Add a DOM listener and store it for later removal.
       */
      addDomListener(type, handler, options) {
        if (this.destroyed) return;
        this.target.addEventListener(type, handler, options);
        this.domListeners.add({ type, handler, options });
        if (this.debug) {
          this.log("debug", `Added DOM listener`, { type, handler, options });
        }
      }
      /**
       * Remove all stored DOM listeners.
       */
      removeAllDomListeners() {
        for (const { type, handler, options } of this.domListeners) {
          try {
            this.target.removeEventListener(type, handler, options);
            if (this.debug) {
              this.log("debug", `Removed DOM listener`, { type, handler });
            }
          } catch (e) {
            this.log("warn", `Failed to remove DOM listener`, { type, handler, error: e });
          }
        }
        this.domListeners.clear();
      }
    };
  }
});

// src/system/features/bin/timing.ts
function createTimeout() {
  let id = null;
  return {
    get id() {
      return id;
    },
    set(fn, ms) {
      if (id !== null) clearTimeout(id);
      id = window.setTimeout(() => {
        id = null;
        fn();
      }, ms);
    },
    cancel() {
      if (id !== null) {
        clearTimeout(id);
        id = null;
      }
    }
  };
}
function debounce(func, delay = 300, immediate = false) {
  if (typeof func !== "function") {
    throw new TypeError("Expected a function for debounce");
  }
  if (typeof delay !== "number" || delay < 0) {
    throw new TypeError("Expected a non-negative number for delay");
  }
  const timer = createTimeout();
  function debounced(...args) {
    const callNow = immediate && timer.id === null;
    timer.set(() => {
      if (!immediate) func.apply(this, args);
    }, delay);
    if (callNow) func.apply(this, args);
  }
  debounced.cancel = () => timer.cancel();
  return debounced;
}
function throttle(func, delay = 100, options = {}) {
  if (typeof func !== "function") {
    throw new TypeError("Expected a function for throttle");
  }
  if (typeof delay !== "number" || delay < 0) {
    throw new TypeError("Expected a non-negative number for delay");
  }
  const { leading = true, trailing = true } = options;
  let lastCall = 0;
  let lastArgs = null;
  let lastThis = null;
  const timer = createTimeout();
  function invoke() {
    lastCall = leading ? Date.now() : 0;
    func.apply(lastThis, lastArgs);
    lastArgs = lastThis = null;
  }
  function throttled(...args) {
    const now = Date.now();
    if (lastCall === 0 && !leading) lastCall = now;
    lastArgs = args;
    lastThis = this;
    const remaining = delay - (now - lastCall);
    if (remaining <= 0 || remaining > delay) {
      timer.cancel();
      invoke();
    } else if (timer.id === null && trailing) {
      timer.set(() => {
        if (trailing && lastArgs) invoke();
      }, remaining);
    }
  }
  throttled.cancel = () => {
    timer.cancel();
    lastCall = 0;
    lastArgs = lastThis = null;
  };
  return throttled;
}
var init_timing = __esm({
  "src/system/features/bin/timing.ts"() {
    "use strict";
  }
});

// src/system/types/events.ts
var EVENTS;
var init_events = __esm({
  "src/system/types/events.ts"() {
    "use strict";
    EVENTS = {
      LOG: "log",
      LOG_DEBUG: "log:debug",
      LOG_ERROR: "log:error",
      TELEMETRY: "telemetry",
      USER_ACTIVE: "user:active",
      USER_INACTIVE: "user:inactive",
      SCREENSAVER_INITIALIZED: "screensaver:initialized",
      SCREENSAVER_SHOWN: "screensaver:shown",
      SCREENSAVER_HIDDEN: "screensaver:hidden",
      SCREENSAVER_ERROR: "screensaver:error",
      SCREENSAVER_LOG: "screensaver:log",
      SLIDEPLAYER_LOG: "slideplayer:log",
      FLOATING_IMAGES_LOG: "floatingImages:log",
      PARTIAL_LOADED: "partial:loaded",
      PARTIAL_ERROR: "partial:error",
      PARTIAL_LOAD_COMPLETE: "partial:load:complete",
      PARTIALS_ALL_LOADED: "partials:allLoaded"
    };
  }
});

// src/system/bin/InactivityWatcher.ts
var InactivityWatcher;
var init_InactivityWatcher = __esm({
  "src/system/bin/InactivityWatcher.ts"() {
    "use strict";
    init_EventWatcher();
    init_EventBus();
    init_timing();
    init_events();
    InactivityWatcher = class _InactivityWatcher extends EventWatcher {
      static _instance = null;
      inactivityDelay;
      lastActiveAt;
      timer;
      userIsInactive = false;
      throttledReset;
      /**
       * Private constructor to enforce singleton pattern.
       * @param target The target to monitor for activity.
       * @param options Configuration options for the watcher.
       */
      constructor(target, options) {
        super(target, options.debug ?? false);
        this.inactivityDelay = options.inactivityDelay;
        this.lastActiveAt = Date.now();
        this.throttledReset = throttle(() => this.resetTimer(), 200);
        this.log(`Initialized with inactivityDelay=${this.inactivityDelay}ms`);
        this.addEventListeners();
      }
      /**
       * Get the singleton instance of the InactivityWatcher.
       * @param options Configuration options for the watcher.
       * @returns The singleton instance.
       */
      static getInstance(options) {
        if (!this._instance) {
          this._instance = new _InactivityWatcher(options.target ?? document, options);
        }
        return this._instance;
      }
      /**
       * Add event listeners to monitor user activity.
       */
      addEventListeners() {
        this.addDomListener("mousemove", this.throttledReset);
        this.addDomListener("keydown", this.throttledReset);
        this.addDomListener("scroll", this.throttledReset);
        this.addDomListener("visibilitychange", this.throttledReset);
        this.resetTimer();
      }
      /**
       * Remove all event listeners and clear the timer.
       */
      removeEventListeners() {
        this.removeAllDomListeners();
        if (this.timer) {
          clearTimeout(this.timer);
          this.timer = void 0;
        }
      }
      /**
       * Reset the inactivity timer and emit an active event if the user was inactive.
       */
      resetTimer() {
        const now = Date.now();
        this.lastActiveAt = now;
        if (this.userIsInactive) {
          this.userIsInactive = false;
          eventBus.emit(EVENTS.USER_ACTIVE, {
            lastActiveAt: this.lastActiveAt,
            inactivityDelay: this.inactivityDelay,
            visible: document.visibilityState === "visible"
          });
          this.log("User is active");
        }
        if (this.timer) clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.setInactive(), this.inactivityDelay);
      }
      /**
       * Mark the user as inactive and emit an inactive event.
       */
      setInactive() {
        this.userIsInactive = true;
        const now = Date.now();
        eventBus.emit(EVENTS.USER_INACTIVE, {
          lastActiveAt: this.lastActiveAt,
          inactiveAt: now,
          inactivityDelay: this.inactivityDelay,
          visible: document.visibilityState === "visible"
        });
        this.log("User is inactive");
      }
    };
  }
});

// src/system/bin/EventLogger.ts
var EventLogger;
var init_EventLogger = __esm({
  "src/system/bin/EventLogger.ts"() {
    "use strict";
    init_EventBus();
    EventLogger = class {
      scope;
      devMode;
      fallbackLogs = [];
      // Fallback storage for logs
      constructor(scope, devMode = true) {
        this.scope = scope;
        this.devMode = devMode;
      }
      /**
       * Filters logs based on the configured log level.
       * Suppresses logs below the specified level in production.
       */
      shouldLog(level) {
        const levels = ["debug", "info", "event", "warn", "error"];
        const currentLevelIndex = levels.indexOf(this.devMode ? "debug" : "warn");
        const logLevelIndex = levels.indexOf(level);
        return logLevelIndex >= currentLevelIndex;
      }
      /**
       * Log a message with the specified level.
       * @param level The log level (e.g., debug, info, warn, error).
       * @param message The log message.
       * @param data Optional additional data to log.
       */
      log(level, message, data) {
        if (!this.shouldLog(level)) return;
        const entry = {
          level,
          scope: this.scope,
          message,
          data,
          time: Date.now()
        };
        try {
          eventBus.emit("log", entry);
        } catch (error) {
          this.fallbackLogs.push(entry);
          if (this.devMode) {
            console.error(`[EventLogger][ERROR] Failed to emit log event`, { entry, error });
          }
        }
        if (this.devMode) {
          console.debug(`[EventLogger][DEBUG] Logging to console`, { level, message, data });
          this.consoleOutput(level, message, data);
        }
      }
      /**
       * Output log to the console based on the log level.
       * @param level The log level.
       * @param message The log message.
       * @param data Optional additional data to log.
       */
      consoleOutput(level, message, data) {
        let method;
        switch (level) {
          case "warn":
            method = "warn";
            break;
          case "error":
            method = "error";
            break;
          default:
            method = "log";
        }
        const prefix = `[${this.scope}][${level.toUpperCase()}]`;
        if (data !== void 0) {
          console[method](prefix, message, data);
        } else {
          console[method](prefix, message);
        }
      }
      /**
       * Retrieve fallback logs stored in memory.
       * @returns An array of fallback log entries.
       */
      getFallbackLogs() {
        return this.fallbackLogs;
      }
      debug(msg, data) {
        this.log("debug", msg, data);
      }
      info(msg, data) {
        this.log("info", msg, data);
      }
      warn(msg, data) {
        this.log("warn", msg, data);
      }
      event(msg, data) {
        this.log("event", msg, data);
      }
      error(msg, data) {
        this.log("error", msg, data);
      }
    };
  }
});

// src/system/bin/EventBinder.ts
var EventBinder, eventBinder;
var init_EventBinder = __esm({
  "src/system/bin/EventBinder.ts"() {
    "use strict";
    init_EventBus();
    init_EventLogger();
    EventBinder = class _EventBinder {
      IBusBindings = [];
      domBindings = [];
      debugMode;
      logger;
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
      debug(method, details) {
        if (!this.debugMode) return;
        try {
          const payload = { method, details };
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
      attachTo(signal) {
        if (signal.aborted) {
          this.unbindAll();
          return () => {
          };
        }
        const listener = () => this.unbindAll();
        signal.addEventListener("abort", listener, { once: true });
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
      setDebugMode(enable) {
        this.debugMode = enable;
        this.logger.info(`Debug mode ${enable ? "enabled" : "disabled"}`);
      }
      /**
       * Bind a handler to an EventBus event.
       * @param event Event name
       * @param handler Event handler function
       */
      bindBus(event, handler) {
        if (this.IBusBindings.find((b) => b.event === event && b.handler === handler)) {
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
      bindDOM(target, event, handler, options = false) {
        if (!target || typeof target.addEventListener !== "function" || typeof target.removeEventListener !== "function") {
          this.logger.warn(`Invalid DOM target for bindDOM: ${String(target)}`);
          return;
        }
        const controller = new AbortController();
        const normalizedOptions = typeof options === "boolean" ? { capture: options, signal: controller.signal } : { ...options, signal: controller.signal };
        const optionsEqual = (a, b) => !!a === !!b && (a?.capture ?? false) === (b?.capture ?? false) && (a?.passive ?? false) === (b?.passive ?? false) && (a?.once ?? false) === (b?.once ?? false);
        if (this.domBindings.find((b) => b.target === target && b.event === event && b.handler === handler && optionsEqual(b.options, normalizedOptions))) {
          this.debug("dom:bind:duplicate", { event, handler, target, options: normalizedOptions });
          return;
        }
        try {
          target.addEventListener(event, handler, normalizedOptions);
          this.domBindings.push({ target, event, handler, options: normalizedOptions, controller });
          this.debug("dom:bind", { event, handler, target, options: normalizedOptions });
        } catch (err) {
          this.logger.error(`Failed to bind DOM event "${event}": ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      /**
       * Unbind all EventBus and DOM event handlers managed by this binder.
       */
      unbindAll() {
        this.debug("unbindAll", {
          bus: this.IBusBindings.length,
          dom: this.domBindings.length
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
      unbindBus(event, handler) {
        const i = this.IBusBindings.findIndex((b) => b.event === event && b.handler === handler);
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
      unbindDOM(target, event, handler) {
        const i = this.domBindings.findIndex((b) => b.target === target && b.event === event && b.handler === handler);
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
      getStats() {
        return {
          busEvents: this.IBusBindings.length,
          domEvents: this.domBindings.length,
          totalEvents: this.IBusBindings.length + this.domBindings.length
        };
      }
      /**
       * Check if there are any active bindings.
       * @returns True if any EventBus or DOM bindings exist
       */
      hasBindings() {
        return this.IBusBindings.length > 0 || this.domBindings.length > 0;
      }
      /**
       * Get details of all active bindings.
       * @returns Object with arrays of bus and DOM binding info
       */
      getBindingDetails() {
        return {
          bus: this.IBusBindings.map((b) => b.event),
          dom: this.domBindings.map((b) => `${b.event}@${b.target.constructor.name}`)
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
      static withAutoUnbind(callback, debug = false) {
        const binder = new _EventBinder(debug);
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
    };
    eventBinder = new EventBinder();
  }
});

// src/system/bin/PartialLoader.ts
var PartialLoader_exports = {};
__export(PartialLoader_exports, {
  PartialLoader: () => PartialLoader,
  VERSION: () => VERSION
});
var VERSION, PartialLoader;
var init_PartialLoader = __esm({
  "src/system/bin/PartialLoader.ts"() {
    "use strict";
    init_timing();
    init_EventBus();
    VERSION = "2.0.0";
    PartialLoader = class {
      cache = /* @__PURE__ */ new Map();
      loadingPromises = /* @__PURE__ */ new Map();
      loadedPartials = /* @__PURE__ */ new Map();
      options;
      constructor(options = {}) {
        this.options = {
          debug: false,
          baseUrl: "/",
          cacheEnabled: true,
          timeout: 1e4,
          retryAttempts: 3,
          ...options
        };
      }
      /** Emit debug events instead of console.debug */
      logDebug(msg, data) {
        if (this.options.debug) {
          const logKey = `${msg}-${JSON.stringify(data)}`;
          if (!this.loadedPartials.has(logKey)) {
            this.loadedPartials.set(logKey, true);
            const payload = {
              scope: "PartialLoader",
              level: "debug",
              message: msg,
              data,
              time: Date.now()
            };
            eventBus.emit("log:debug", payload);
            eventBus.emit("log", payload);
          }
        }
      }
      /** Load partials from links or info objects */
      async load(input) {
        const items = Array.isArray(input) ? input : [input];
        const results = [];
        for (const item of items) {
          try {
            if (item instanceof HTMLLinkElement) {
              results.push(await this.loadLink(item));
            } else {
              results.push(await this.loadInfo(item));
            }
          } catch (error) {
            const url = item instanceof HTMLLinkElement ? item.getAttribute("src") || "" : item.url;
            this.logDebug("Failed to load partial", { url, error });
            results.push({ success: false, url, cached: false });
          }
        }
        eventBus.emit("partials:allLoaded", { url: "", cached: false });
        this.logDebug("All partials loaded", { count: results.length });
        return results;
      }
      loadLink(link) {
        const src = link.getAttribute("src");
        if (!src) throw new Error("Partial link missing src");
        return this.loadUrl(this.resolveUrl(src), link);
      }
      loadInfo(info) {
        return this.loadUrl(this.resolveUrl(info.url), info.container, info.id);
      }
      async loadUrl(url, container, id) {
        try {
          if (this.options.cacheEnabled && this.cache.has(url)) {
            this.insertHTML(container, this.cache.get(url));
            this.loadedPartials.set(id || url, true);
            eventBus.emit("partial:loaded", { url, html: this.cache.get(url), cached: true });
            this.logDebug("Partial loaded from cache", { url, id });
            return { success: true, url, cached: true };
          }
          let fetchPromise = this.loadingPromises.get(url);
          if (!fetchPromise) {
            fetchPromise = this.fetchWithRetry(url);
            this.loadingPromises.set(url, fetchPromise);
          }
          const html = await fetchPromise;
          if (this.options.cacheEnabled) this.cache.set(url, html);
          this.insertHTML(container, html);
          this.loadedPartials.set(id || url, true);
          eventBus.emit("partial:loaded", { url, html, cached: false });
          this.logDebug("Partial loaded", { url, id });
          return { success: true, url, cached: false };
        } catch (error) {
          this.showError(container, error);
          eventBus.emit("partial:error", { url, error });
          this.logDebug("Partial load failed", { url, id, error });
          throw error;
        } finally {
          this.loadingPromises.delete(url);
          eventBus.emit("partial:load:complete", { url });
          this.logDebug("Partial load complete", { url, id });
        }
      }
      async fetchWithRetry(url, attempt = 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
        try {
          const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const html = (await res.text()).trim();
          if (!html) throw new Error("Empty response");
          return html;
        } catch (err) {
          if (attempt < this.options.retryAttempts) {
            this.logDebug("Retrying fetch", { url, attempt });
            await this.delay(Math.min(2 ** attempt * 100, 5e3));
            return this.fetchWithRetry(url, attempt + 1);
          }
          throw err;
        } finally {
          clearTimeout(timeoutId);
        }
      }
      async fetchPartial(url, attempt = 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
        try {
          const res = await fetch(url, { signal: controller.signal, headers: { Accept: "text/html" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const html = (await res.text()).trim();
          if (!html) throw new Error("Empty response");
          return html;
        } catch (err) {
          if (attempt < this.options.retryAttempts) {
            this.logDebug("Retrying fetch", { url, attempt });
            await this.delay(Math.min(2 ** attempt * 100, 5e3));
            return this.fetchPartial(url, attempt + 1);
          }
          throw err;
        } finally {
          clearTimeout(timeoutId);
        }
      }
      insertHTML(container, html) {
        const template = document.createElement("template");
        template.innerHTML = html;
        if (container instanceof HTMLLinkElement) {
          container.replaceWith(...template.content.childNodes);
        } else if (container instanceof Element) {
          container.innerHTML = "";
          container.append(...template.content.childNodes);
        } else {
          container.append(...template.content.childNodes);
        }
        this.logDebug("Inserted HTML into container", { container });
      }
      showError(container, error) {
        const div = document.createElement("div");
        div.className = "partial-error";
        div.textContent = "Partial load failed";
        if (this.options.debug) div.textContent += `: ${error.message}`;
        if (container instanceof HTMLLinkElement) {
          container.replaceWith(div);
        } else if (container instanceof Element) {
          container.innerHTML = "";
          container.appendChild(div);
        } else {
          container.appendChild(div);
        }
        eventBus.emit("log:error", {
          scope: "PartialLoader",
          message: "Partial load failed",
          error,
          context: {
            url: container instanceof HTMLLinkElement ? container.href : void 0,
            retryAttempts: this.options.retryAttempts
          }
        });
        this.logDebug("Error displayed in container", { container, error });
      }
      isPartialLoaded(id) {
        return this.loadedPartials.has(id);
      }
      resolveUrl(src) {
        if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(src) || src.startsWith("//")) {
          this.logDebug("URL is already absolute", { src });
          return src;
        }
        try {
          const base = this.options.baseUrl || window.location.origin + "/";
          const url = new URL(src, base).toString();
          const resolvedUrl = url.startsWith(window.location.origin) ? url.slice(window.location.origin.length) || "/" : url;
          this.logDebug("Resolved relative URL", { src, resolvedUrl });
          return resolvedUrl;
        } catch (error) {
          this.logDebug("Failed to resolve URL", { src, error });
          return src;
        }
      }
      delay(ms) {
        this.logDebug("Delaying execution", { ms });
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      async loadContainer(container = document) {
        const links = container.querySelectorAll('link[rel="partial"][src]');
        if (!links.length) return [];
        return this.load(Array.from(links));
      }
      watch(container = document.body) {
        if (!window.MutationObserver) return;
        const observer = new MutationObserver(
          debounce(() => this.loadContainer(container), 100)
        );
        observer.observe(container, { childList: true, subtree: true });
        this.logDebug("Watching container for partials", { container });
        return observer;
      }
      /** Exposed method so PartialFetcher can reuse loader's cache + retry */
      async fetchWithLoaderCache(url) {
        if (this.options.cacheEnabled && this.cache.has(url)) {
          this.logDebug("Fetching from cache", { url });
          return this.cache.get(url);
        }
        const html = await this.fetchPartial(url);
        if (this.options.cacheEnabled) this.cache.set(url, html);
        this.logDebug("Fetched and cached partial", { url });
        return html;
      }
    };
  }
});

// src/system/bin/PartialFetcher.ts
var PartialFetcher;
var init_PartialFetcher = __esm({
  "src/system/bin/PartialFetcher.ts"() {
    "use strict";
    init_EventBus();
    init_PartialLoader();
    PartialFetcher = class {
      /** Default internal loader instance */
      static loader;
      /**
       * Get or create the default loader instance.
       * @returns The default loader instance.
       */
      static getLoader() {
        return this.loader ?? (this.loader = new PartialLoader());
      }
      /**
       * Emit debug logs via EventBus.
       * @param message The debug message.
       * @param data Additional data to log.
       */
      static logDebug(message, data) {
        const payload = {
          scope: "PartialFetcher",
          level: "debug",
          message,
          data,
          time: Date.now()
        };
        eventBus.emit("log", payload);
      }
      /**
       * Load a partial HTML into a target container.
       * @param url The URL of the partial to load.
       * @param targetSelector The CSS selector of the target container.
       * @param options Additional options for the loader.
       */
      static async load(url, targetSelector, options = {}) {
        const loader = options.loader ?? this.getLoader();
        const container = document.querySelector(targetSelector);
        if (!container) throw new Error(`Target ${targetSelector} not found`);
        try {
          this.logDebug("Fetching partial", { url, targetSelector });
          await loader.load([{ url, container }]);
          eventBus.emit("partial:loaded", { url, targetSelector, cached: false });
          this.logDebug("Partial loaded successfully", { url, targetSelector });
        } catch (error) {
          eventBus.emit("partial:error", { url, error });
          this.logDebug("Partial load error", { url, error });
          throw error;
        } finally {
          eventBus.emit("partial:load:complete", { url, targetSelector, error: false });
        }
      }
      /**
       * Preload multiple partials without rendering them.
       * @param urls The URLs of the partials to preload.
       * @param loader Optional custom loader instance.
       * @returns A promise that resolves when all partials are preloaded.
       */
      static async preload(urls, loader) {
        const activeLoader = loader ?? this.getLoader();
        const dummyContainer = document.createElement("div");
        return Promise.all(
          urls.map(async (url) => {
            try {
              this.logDebug("Preloading partial", { url });
              await activeLoader.load([{ url, container: dummyContainer }]);
              eventBus.emit("partial:loaded", { url, cached: true });
            } catch (error) {
              eventBus.emit("partial:error", { url, error });
              this.logDebug("Preload error", { url, error });
            } finally {
              eventBus.emit("partial:load:complete", { url, error: false });
            }
          })
        );
      }
      /**
       * Watch a container for dynamic partial loading.
       * @param container The container to watch.
       * @param loader Optional custom loader instance.
       * @returns The result of the loader's watch method.
       */
      static watch(container = document.body, loader) {
        const activeLoader = loader ?? this.getLoader();
        this.logDebug("Watching container for partials", { container });
        return activeLoader.watch?.(container);
      }
    };
  }
});

// src/system/features/bin/AsyncImageLoader.ts
var AsyncImageLoader;
var init_AsyncImageLoader = __esm({
  "src/system/features/bin/AsyncImageLoader.ts"() {
    "use strict";
    AsyncImageLoader = class {
      container;
      includePicture;
      debug;
      cache = /* @__PURE__ */ new WeakMap();
      destroyed = false;
      constructor(container, options = {}) {
        if (!(container instanceof Element)) {
          throw new Error("AsyncImageLoader: container must be a DOM Element.");
        }
        this.container = container;
        this.includePicture = options.includePicture ?? false;
        this.debug = options.debug ?? false;
      }
      logDebug(message, data) {
        if (!this.debug) return;
        console.debug(`[AsyncImageLoader] ${message}`, data);
      }
      ensureActive(methodName) {
        if (this.destroyed || !this.container) {
          throw new Error(`AsyncImageLoader: Instance destroyed. Method: ${methodName}`);
        }
      }
      getImages(selector = "img") {
        this.ensureActive("getImages");
        if (!selector.trim()) return [];
        const images = /* @__PURE__ */ new Set();
        this.container.querySelectorAll(selector).forEach((el) => {
          if (el instanceof HTMLImageElement) {
            if (!this.includePicture && el.closest("picture")) return;
            images.add(el);
          }
        });
        return [...images];
      }
      // ---------- Implementation ----------
      async waitForImagesToLoad(selector = "img", includeFailed = false, timeout = 1e4) {
        this.logDebug("Waiting for images to load", { selector, includeFailed, timeout });
        const images = this.getImages(selector);
        const results = await Promise.all(
          images.map((img) => {
            if (this.cache.has(img)) {
              this.logDebug("Image already cached", { img });
              return { element: img, loaded: true };
            }
            if (img.complete && img.naturalWidth > 0) {
              this.cache.set(img, true);
              this.logDebug("Image already loaded", { img });
              return { element: img, loaded: true };
            }
            return new Promise((resolve) => {
              const onLoad = () => {
                clearTimeout(timer);
                this.cache.set(img, true);
                this.logDebug("Image loaded successfully", { img });
                resolve({ element: img, loaded: true });
              };
              const onError = () => {
                clearTimeout(timer);
                this.logDebug("Image failed to load", { img });
                resolve({ element: img, loaded: false });
              };
              const timer = setTimeout(() => {
                img.removeEventListener("load", onLoad);
                img.removeEventListener("error", onError);
                this.logDebug("Image load timeout", { img });
                resolve({ element: img, loaded: false });
              }, timeout);
              img.addEventListener("load", onLoad, { once: true });
              img.addEventListener("error", onError, { once: true });
            });
          })
        );
        return includeFailed ? results : results.filter((r) => r.loaded).map((r) => r.element);
      }
      getImageData(selector = "img") {
        return this.getImages(selector).map((img) => {
          const sources = [];
          if (this.includePicture) {
            const picture = img.closest("picture");
            if (picture) {
              picture.querySelectorAll("source").forEach((source) => {
                sources.push({
                  srcset: source.srcset || "",
                  type: source.type || "",
                  media: source.media || ""
                });
              });
            }
          }
          return {
            element: img,
            src: img.src || "",
            alt: img.alt || "",
            href: img.closest("a")?.href ?? null,
            sources
          };
        });
      }
      clearCache() {
        this.logDebug("Clearing image cache");
        this.cache = /* @__PURE__ */ new WeakMap();
      }
      destroy() {
        this.container = null;
        this.destroyed = true;
      }
    };
  }
});

// src/system/features/bin/AnimationLoop.ts
var AnimationLoop, animationLoop;
var init_AnimationLoop = __esm({
  "src/system/features/bin/AnimationLoop.ts"() {
    "use strict";
    AnimationLoop = class {
      callbacks = /* @__PURE__ */ new Set();
      running = false;
      _rafId = null;
      errorHandler;
      constructor(errorHandler = console.error) {
        this.errorHandler = errorHandler;
      }
      /**
       * Adds a callback to the animation loop.
       * Starts the loop if it is not already running.
       *
       * @param callback - The function to be called on each animation frame.
       */
      add(callback) {
        if (typeof callback !== "function") {
          throw new TypeError("AnimationLoop.add: Callback must be a function");
        }
        if (!this.callbacks.has(callback)) this.callbacks.add(callback);
        this.start();
      }
      /**
       * Removes a callback from the animation loop.
       * Stops the loop if no callbacks remain.
       *
       * @param callback - The function to be removed.
       */
      remove(callback) {
        this.callbacks.delete(callback);
        if (this.callbacks.size === 0) this.stop();
      }
      /**
       * Removes all callbacks from the animation loop.
       * Stops the loop if it is running.
       */
      clear() {
        this.callbacks.clear();
        this.stop();
      }
      /**
       * Checks if a callback is currently in the animation loop.
       *
       * @param callback - The function to check.
       * @returns True if the callback is in the loop, false otherwise.
       */
      has(callback) {
        return this.callbacks.has(callback);
      }
      /**
       * Pauses the animation loop, stopping all callbacks temporarily.
       * This is equivalent to calling `stop` but does not clear callbacks.
       */
      pause() {
        this.stop();
      }
      /**
       * Resumes the animation loop if there are callbacks to execute.
       */
      resume() {
        if (this.callbacks.size > 0) this.start();
      }
      /**
       * Starts the animation loop if it is not already running.
       * Private method to ensure controlled access.
       */
      start() {
        if (this.running || this.callbacks.size === 0) return;
        this.running = true;
        this._rafId = requestAnimationFrame(this._loop);
      }
      /**
       * Stops the animation loop and cancels the next frame.
       * Private method to ensure controlled access.
       */
      stop() {
        this.running = false;
        if (this._rafId !== null) cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      /**
       * The main loop function, executed on each animation frame.
       * Iterates over a snapshot of callbacks to allow safe modification during execution.
       */
      _loop = () => {
        if (!this.running) return;
        for (const cb of Array.from(this.callbacks)) {
          try {
            cb();
          } catch (err) {
            this.errorHandler(err);
          }
        }
        this._rafId = requestAnimationFrame(this._loop);
      };
    };
    animationLoop = new AnimationLoop();
  }
});

// src/system/features/bin/AnimationPolicy.ts
var AnimationPolicy;
var init_AnimationPolicy = __esm({
  "src/system/features/bin/AnimationPolicy.ts"() {
    "use strict";
    AnimationPolicy = class {
      pausedReasons = /* @__PURE__ */ new Set();
      set(reason, paused) {
        if (paused) this.pausedReasons.add(reason);
        else this.pausedReasons.delete(reason);
      }
      has(reason) {
        return this.pausedReasons.has(reason);
      }
      isPaused() {
        return this.pausedReasons.size > 0;
      }
      list() {
        return Array.from(this.pausedReasons);
      }
      clear() {
        this.pausedReasons.clear();
      }
    };
  }
});

// src/system/features/SlidePlayer/SlidePlayer.ts
var SlidePlayer_exports = {};
__export(SlidePlayer_exports, {
  SlidePlayer: () => SlidePlayer,
  VERSION: () => VERSION2
});
var VERSION2, SlidePlayer;
var init_SlidePlayer = __esm({
  "src/system/features/SlidePlayer/SlidePlayer.ts"() {
    "use strict";
    init_EventBus();
    init_EventBinder();
    init_AsyncImageLoader();
    init_AnimationLoop();
    init_AnimationPolicy();
    init_events();
    VERSION2 = "2.0.0";
    SlidePlayer = class _SlidePlayer {
      static SWIPE_THRESHOLD = 50;
      static VERTICAL_TOLERANCE = 30;
      static DEFAULT_INTERVAL = 5e3;
      container;
      interval;
      includePicture;
      dotsSelector;
      autoCreateDots;
      enableBusEvents;
      autoplay;
      debug;
      slides = [];
      dots = [];
      dotsWrapper = null;
      currentIndex = 0;
      lastTickTime = 0;
      isDestroyed = false;
      isPointerDown = false;
      pointerStartX = 0;
      pointerStartY = 0;
      pointerEndX = 0;
      pointerEndY = 0;
      animationPolicy = new AnimationPolicy();
      loader;
      binder;
      animateCallback;
      lastPauseState = false;
      ready;
      initError = null;
      constructor(containerOrSelector, {
        interval = _SlidePlayer.DEFAULT_INTERVAL,
        includePicture = false,
        dotsSelector = ".dots",
        autoCreateDots = false,
        startPaused = false,
        enableBusEvents = true,
        autoplay = true,
        debug = false
      } = {}) {
        this.container = this.resolveContainer(containerOrSelector);
        this.interval = interval > 0 ? interval : _SlidePlayer.DEFAULT_INTERVAL;
        this.includePicture = includePicture;
        this.dotsSelector = dotsSelector;
        this.autoCreateDots = autoCreateDots;
        this.enableBusEvents = enableBusEvents;
        this.autoplay = autoplay;
        this.debug = debug;
        this.loader = new AsyncImageLoader(this.container, { includePicture });
        this.binder = new EventBinder(this.debug);
        if (startPaused) this.animationPolicy.set("manual", true);
        this.animateCallback = () => this.animate();
        this.ready = this.init().catch((err) => {
          this.initError = err;
          this.log("error", "SlidePlayer init failed", err);
        }).then(() => {
        });
        this.log("info", "SlidePlayer initialized", { container: this.container, interval, autoplay, debug });
      }
      /** ---- Centralized logging ---- */
      log(level, message, data) {
        if (!this.debug && level === "debug") return;
        const payload = { scope: "SlidePlayer", level, message, data, time: Date.now() };
        eventBus.emit(EVENTS.SLIDEPLAYER_LOG, { level, message, data });
        eventBus.emit(EVENTS.LOG, payload);
        if (this.debug) {
          const methodMap = {
            debug: "debug",
            info: "info",
            warn: "warn",
            error: "error"
          };
          console[methodMap[level]]?.(`[SlidePlayer] [${level.toUpperCase()}]`, message, data);
        }
      }
      resolveContainer(containerOrSelector) {
        const container = typeof containerOrSelector === "string" ? document.querySelector(containerOrSelector) : containerOrSelector;
        if (!container) throw new Error("SlidePlayer: container element not found.");
        return container;
      }
      /** ---- Initialization ---- */
      async init() {
        await this.loader.waitForImagesToLoad();
        this.refreshSlides();
        if (!this.slides.length) {
          this.log("warn", "No .slide elements found in container.");
          return;
        }
        this.setupDots();
        this.bindEvents();
        this.setActiveSlide(0);
        this.lastTickTime = performance.now();
        if (!this.isPaused() && this.autoplay) {
          animationLoop.add(this.animateCallback);
        }
      }
      /** ---- RAF Animation ---- */
      animate() {
        if (this.isDestroyed || !this.autoplay || this.isPaused() || this.slides.length < 2) return;
        const now = performance.now();
        const elapsed = now - this.lastTickTime;
        if (elapsed >= this.interval) {
          this.next(false);
          this.lastTickTime = now;
        }
      }
      /** ---- Pause / Resume ---- */
      togglePause(reason, shouldPause) {
        this.animationPolicy.set(reason, shouldPause);
        this.emitPauseResumeIfChanged();
        if (this.isPaused()) {
          if (animationLoop.has(this.animateCallback)) animationLoop.remove(this.animateCallback);
          this.log("debug", `Paused due to: ${this.animationPolicy.list().join(", ")}`);
        } else {
          if (!animationLoop.has(this.animateCallback)) animationLoop.add(this.animateCallback);
          this.log("debug", "Resumed playback");
        }
      }
      emitPauseResumeIfChanged() {
        const nowPaused = this.isPaused();
        if (nowPaused !== this.lastPauseState) {
          this.lastPauseState = nowPaused;
          const event = nowPaused ? "slideplayer:paused" : "slideplayer:resumed";
          this.emit(event, { reasons: this.animationPolicy.list() });
        }
      }
      play() {
        this.togglePause("manual", false);
      }
      pause() {
        this.togglePause("manual", true);
      }
      isPaused() {
        return this.animationPolicy.isPaused();
      }
      /** ---- Slide Navigation ---- */
      goToSlide(index, restart = true) {
        if (index < 0 || index >= this.slides.length || index === this.currentIndex) return;
        this.setActiveSlide(index);
        if (restart) this.resetTimer();
      }
      next(restart = true) {
        if (this.slides.length < 2) return;
        this.goToSlide((this.currentIndex + 1) % this.slides.length, restart);
      }
      prev(restart = true) {
        if (this.slides.length < 2) return;
        const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
        this.goToSlide(prevIndex, restart);
      }
      /** ---- Slides / Dots ---- */
      refreshSlides() {
        this.slides = Array.from(this.container.querySelectorAll(".slide"));
      }
      setupDots() {
        this.dotsWrapper = this.container.querySelector(this.dotsSelector);
        if (!this.dotsWrapper && this.autoCreateDots) {
          this.dotsWrapper = document.createElement("div");
          this.dotsWrapper.className = "dots";
          this.container.appendChild(this.dotsWrapper);
        }
        if (!this.dotsWrapper) return;
        this.dotsWrapper.innerHTML = "";
        this.dots = this.slides.map((_, i) => {
          const dot = document.createElement("div");
          dot.className = "dot";
          dot.dataset.index = i.toString();
          this.binder.bindDOM(dot, "click", () => this.goToSlide(i));
          this.dotsWrapper.appendChild(dot);
          return dot;
        });
      }
      updateDots(index) {
        this.dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
      }
      setActiveSlide(index) {
        const prev = this.currentIndex;
        this.slides[this.currentIndex]?.classList.remove("active");
        this.currentIndex = index;
        this.slides[this.currentIndex]?.classList.add("active");
        this.updateDots(index);
        if (prev !== index) this.emit("slideplayer:slideChanged", { index }, "slideplayer:slide-changed");
      }
      resetTimer() {
        this.lastTickTime = performance.now();
      }
      /** ---- Event Binding ---- */
      bindEvents() {
        this.bindPointerEvents();
        this.bindKeyboardEvents();
        this.bindVisibilityEvents();
        this.bindActivityEvents();
        this.bindUnloadEvent();
      }
      bindPointerEvents() {
        this.binder.bindDOM(this.container, "pointerdown", (e) => {
          const ev = e;
          this.isPointerDown = true;
          this.pointerStartX = ev.clientX;
          this.pointerStartY = ev.clientY;
          this.pointerEndX = ev.clientX;
          this.pointerEndY = ev.clientY;
        });
        this.binder.bindDOM(this.container, "pointermove", (e) => {
          if (!this.isPointerDown) return;
          const ev = e;
          this.pointerEndX = ev.clientX;
          this.pointerEndY = ev.clientY;
        });
        this.binder.bindDOM(window, "pointerup", () => {
          if (this.isPointerDown) {
            this.handleSwipe();
            this.isPointerDown = false;
          }
        });
        this.binder.bindDOM(window, "pointercancel", () => {
          this.isPointerDown = false;
        });
        this.binder.bindDOM(this.container, "pointerleave", () => this.isPointerDown = false);
        this.binder.bindDOM(this.container, "mouseenter", () => this.togglePause("hover", true));
        this.binder.bindDOM(this.container, "mouseleave", () => this.togglePause("hover", false));
      }
      bindKeyboardEvents() {
        this.binder.bindDOM(document, "keydown", (e) => {
          const ev = e;
          if (ev.key === "ArrowRight") this.next();
          else if (ev.key === "ArrowLeft") this.prev();
        });
      }
      bindVisibilityEvents() {
        this.binder.bindDOM(document, "visibilitychange", () => {
          this.togglePause("hidden", document.visibilityState === "hidden");
        });
      }
      bindActivityEvents() {
        if (this.enableBusEvents) {
          this.binder.bindBus(EVENTS.USER_INACTIVE, () => this.togglePause("inactivity", true));
          this.binder.bindBus(EVENTS.USER_ACTIVE, () => this.togglePause("inactivity", false));
          this.binder.bindBus(EVENTS.SCREENSAVER_SHOWN, () => this.togglePause("screensaver", true));
          this.binder.bindBus(EVENTS.SCREENSAVER_HIDDEN, () => this.togglePause("screensaver", false));
        }
      }
      bindUnloadEvent() {
        this.binder.bindDOM(window, "beforeunload", () => this.destroy());
      }
      handleSwipe() {
        const dx = this.pointerEndX - this.pointerStartX;
        const dy = this.pointerEndY - this.pointerStartY;
        if (Math.abs(dx) >= _SlidePlayer.SWIPE_THRESHOLD && Math.abs(dy) < _SlidePlayer.VERTICAL_TOLERANCE) {
          const direction = dx < 0 ? "next" : "prev";
          this.log("debug", `Swipe detected`, { dx, dy, direction });
          dx < 0 ? this.next() : this.prev();
        }
      }
      emit(type, detail, busEvent) {
        this.container.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
        if (this.enableBusEvents && busEvent) eventBus.emit(busEvent, detail);
      }
      destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        animationLoop.remove(this.animateCallback);
        this.binder.unbindAll();
        this.loader.destroy();
        this.slides = [];
        this.dots = [];
        this.dotsWrapper = null;
        this.animationPolicy.clear();
        this.log("info", "SlidePlayer destroyed");
      }
      /** ---- Public getters ---- */
      get currentSlideIndex() {
        return this.currentIndex;
      }
      get slideCount() {
        return this.slides.length;
      }
    };
  }
});

// src/system/features/bin/math.ts
var clamp;
var init_math = __esm({
  "src/system/features/bin/math.ts"() {
    "use strict";
    clamp = (value, min, max) => {
      if (min > max) {
        throw new RangeError("The `min` value cannot be greater than the `max` value.");
      }
      return Math.max(min, Math.min(value, max));
    };
  }
});

// src/system/features/FloatingImages/FloatingImage.ts
var DAMPING, MIN_VELOCITY, MAX_SPEED, VELOCITY_JITTER, FloatingImage;
var init_FloatingImage = __esm({
  "src/system/features/FloatingImages/FloatingImage.ts"() {
    "use strict";
    init_math();
    DAMPING = 0.85;
    MIN_VELOCITY = 0.1;
    MAX_SPEED = 2.5;
    VELOCITY_JITTER = 0.02;
    FloatingImage = class {
      element;
      size;
      x;
      y;
      vx;
      vy;
      options;
      constructor(element, dims, options = {}) {
        this.element = element;
        this.options = { useSubpixel: true, debug: false, ...options };
        this.size = { width: element.offsetWidth, height: element.offsetHeight };
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        element.style.willChange = "transform";
        element.style.backfaceVisibility = "hidden";
        element.style.perspective = "1000px";
        element.style.opacity = "1";
        this.updatePosition();
      }
      logDebug(message, data) {
        if (this.options.debug) {
          console.debug(`[FloatingImage] ${message}`, data);
        }
      }
      updatePosition() {
        if (!this.element) {
          this.logDebug("updatePosition called on destroyed element");
          return false;
        }
        const x = this.options.useSubpixel ? this.x : Math.round(this.x);
        const y = this.options.useSubpixel ? this.y : Math.round(this.y);
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        this.logDebug("Position updated", { x, y });
        return true;
      }
      getElement() {
        return this.element;
      }
      update(multiplier, dims, applyPosition = true) {
        if (!this.element) {
          this.logDebug("update called on destroyed element");
          return false;
        }
        this.x += this.vx * multiplier;
        this.y += this.vy * multiplier;
        this.handleCollisions(dims);
        this.applyVelocityJitter();
        if (applyPosition) return this.updatePosition();
        return true;
      }
      handleCollisions(dims) {
        if (this.x <= 0 || this.x + this.size.width >= dims.width) {
          this.vx = -this.vx * DAMPING;
          const signX = this.vx >= 0 ? 1 : -1;
          this.vx = Math.abs(this.vx) < MIN_VELOCITY ? signX * MIN_VELOCITY : this.vx;
          this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
          this.logDebug("Horizontal collision handled", { x: this.x, vx: this.vx });
        }
        if (this.y <= 0 || this.y + this.size.height >= dims.height) {
          this.vy = -this.vy * DAMPING;
          const signY = this.vy >= 0 ? 1 : -1;
          this.vy = Math.abs(this.vy) < MIN_VELOCITY ? signY * MIN_VELOCITY : this.vy;
          this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));
          this.logDebug("Vertical collision handled", { y: this.y, vy: this.vy });
        }
      }
      applyVelocityJitter() {
        this.vx += (Math.random() - 0.5) * VELOCITY_JITTER;
        this.vy += (Math.random() - 0.5) * VELOCITY_JITTER;
        const speedSquared = this.vx ** 2 + this.vy ** 2;
        if (speedSquared > MAX_SPEED ** 2) {
          const scale = MAX_SPEED / Math.sqrt(speedSquared);
          this.vx *= scale;
          this.vy *= scale;
          this.logDebug("Velocity clamped", { vx: this.vx, vy: this.vy });
        }
      }
      resetPosition(dims) {
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.updatePosition();
      }
      updateSize() {
        if (!this.element) return;
        this.size.width = this.element.offsetWidth;
        this.size.height = this.element.offsetHeight;
      }
      clampPosition(dims) {
        this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
        this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));
      }
      destroy() {
        if (!this.element) return;
        this.element.style.willChange = "auto";
        this.element.style.backfaceVisibility = "";
        this.element.style.perspective = "";
        this.element = null;
      }
    };
  }
});

// src/system/features/bin/PerformanceMonitor.ts
var PerformanceMonitor;
var init_PerformanceMonitor = __esm({
  "src/system/features/bin/PerformanceMonitor.ts"() {
    "use strict";
    PerformanceMonitor = class {
      fps = 60;
      lastTime = performance.now();
      frameSkipThreshold = 30;
      shouldSkipFrame = false;
      frameCount = 0;
      cachedPerformanceLevel = "high";
      lastLevelUpdate = 0;
      levelUpdateInterval = 1e3;
      cachedSettings = null;
      lastLoggedFPS = 60;
      fpsLogThreshold = 5;
      /** Updates FPS and returns whether to skip this frame */
      update() {
        const now = performance.now();
        const delta = now - this.lastTime;
        if (delta < 1) return this.shouldSkipFrame;
        const currentFPS = 1e3 / delta;
        this.fps = this.fps * 0.9 + currentFPS * 0.1;
        this.frameCount++;
        this.shouldSkipFrame = this.fps < this.frameSkipThreshold;
        if (Math.abs(this.fps - this.lastLoggedFPS) >= this.fpsLogThreshold) {
          this.lastLoggedFPS = this.fps;
        }
        this.lastTime = now;
        return this.shouldSkipFrame;
      }
      getFrameCount() {
        return this.frameCount;
      }
      getCurrentFPS() {
        return Math.round(this.fps * 10) / 10;
      }
      getPerformanceLevel() {
        const now = performance.now();
        if (now - this.lastLevelUpdate > this.levelUpdateInterval) {
          this.cachedPerformanceLevel = this.fps >= 50 ? "high" : this.fps >= 30 ? "medium" : "low";
          this.lastLevelUpdate = now;
          this.cachedSettings = null;
        }
        return this.cachedPerformanceLevel;
      }
      getRecommendedSettings() {
        if (this.cachedSettings) return this.cachedSettings;
        const level = this.getPerformanceLevel();
        const settingsMap = {
          high: { maxImages: 50, speedMultiplier: 1, useSubpixel: true },
          medium: { maxImages: 25, speedMultiplier: 0.8, useSubpixel: false },
          low: { maxImages: 10, speedMultiplier: 0.5, useSubpixel: false }
        };
        this.cachedSettings = settingsMap[level];
        return this.cachedSettings;
      }
      reset() {
        this.fps = 60;
        this.lastTime = performance.now();
        this.shouldSkipFrame = false;
        this.frameCount = 0;
        this.cachedPerformanceLevel = "high";
        this.lastLevelUpdate = 0;
        this.cachedSettings = null;
        this.lastLoggedFPS = 60;
      }
    };
  }
});

// src/system/features/bin/ResizeManager.ts
var ResizeManager, resizeManager;
var init_ResizeManager = __esm({
  "src/system/features/bin/ResizeManager.ts"() {
    "use strict";
    init_timing();
    ResizeManager = class {
      windowCallbacks = /* @__PURE__ */ new Map();
      elementObservers = /* @__PURE__ */ new Map();
      debug = false;
      setDebugMode(enabled) {
        this.debug = enabled;
      }
      logDebug(message, data) {
        if (!this.debug) return;
        console.debug(`[ResizeManager] ${message}`, data);
      }
      wrapCallback(cb, options) {
        if (options?.debounceMs != null) {
          return debounce(cb, options.debounceMs);
        } else if (options?.throttleMs != null) {
          return throttle(cb, options.throttleMs);
        } else {
          const wrappedCb = cb;
          wrappedCb.cancel = () => {
          };
          return wrappedCb;
        }
      }
      /**
       * Register a callback for window resize events.
       * Optionally debounce or throttle the callback.
       */
      onWindow(cb, options = { debounceMs: 200 }) {
        const wrappedCb = debounce(cb, options.debounceMs);
        const handler = () => wrappedCb();
        this.windowCallbacks.set(cb, handler);
        window.addEventListener("resize", handler);
        return () => {
          window.removeEventListener("resize", handler);
          wrappedCb.cancel?.();
          this.windowCallbacks.delete(cb);
        };
      }
      /**
       * Register a callback for an element's resize events.
       * Optionally debounce or throttle the callback.
       */
      onElement(el, cb, options) {
        this.logDebug("Registering element resize callback", { el, cb, options });
        let entry = this.elementObservers.get(el);
        if (!entry) {
          const callbacks = /* @__PURE__ */ new Set();
          const observer = new ResizeObserver((entries) => {
            try {
              const entry2 = entries[0];
              callbacks.forEach((fn) => fn(entry2));
            } catch (error) {
              this.logDebug("ResizeObserver callback error", { error });
            }
          });
          entry = { observer, callbacks };
          this.elementObservers.set(el, entry);
          observer.observe(el);
        }
        const wrappedCb = this.wrapCallback(cb, options);
        entry.callbacks.add(wrappedCb);
        return () => {
          this.logDebug("Removing element resize callback", { el, cb });
          entry.callbacks.delete(wrappedCb);
          wrappedCb.cancel?.();
          if (entry.callbacks.size === 0) {
            entry.observer.disconnect();
            this.elementObservers.delete(el);
          }
        };
      }
      /**
       * Get current size of an element.
       */
      getElement(el) {
        try {
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        } catch (error) {
          throw new Error("ResizeManager: Failed to get element size.");
        }
      }
      /**
       * Cleanup all registered window and element callbacks.
       */
      destroy() {
        this.logDebug("Destroying ResizeManager");
        for (const [cb, handler] of this.windowCallbacks.entries()) {
          window.removeEventListener("resize", handler);
        }
        this.windowCallbacks.clear();
        for (const entry of this.elementObservers.values()) {
          entry.observer.disconnect();
          for (const fn of entry.callbacks) {
            fn.cancel?.();
          }
        }
        this.elementObservers.clear();
        this.logDebug("ResizeManager destroyed");
      }
    };
    resizeManager = new ResizeManager();
  }
});

// src/system/features/FloatingImages/FloatingImagesManager.ts
var FloatingImagesManager_exports = {};
__export(FloatingImagesManager_exports, {
  FloatingImagesManager: () => FloatingImagesManager,
  VERSION: () => VERSION3
});
var VERSION3, FloatingImagesManager;
var init_FloatingImagesManager = __esm({
  "src/system/features/FloatingImages/FloatingImagesManager.ts"() {
    "use strict";
    init_FloatingImage();
    init_PerformanceMonitor();
    init_ResizeManager();
    init_AsyncImageLoader();
    init_AnimationLoop();
    init_EventBus();
    init_timing();
    init_AnimationPolicy();
    init_events();
    VERSION3 = "2.1.0";
    FloatingImagesManager = class {
      container;
      performanceMonitor;
      images = [];
      speedMultiplier = 1;
      isInViewport = true;
      _destroyed = false;
      animateCallback;
      maxImages;
      intersectionObserver;
      unsubscribeWindow;
      unsubscribeElement;
      imageLoader;
      containerWidth;
      containerHeight;
      debug;
      hoverBehavior;
      hoverSlowMultiplier;
      tapToFreeze;
      pauseOnScreensaver;
      interactionCleanups = [];
      frozenElements = /* @__PURE__ */ new WeakSet();
      imageSpeedOverrides = /* @__PURE__ */ new WeakMap();
      unsubScreensaverShown;
      unsubScreensaverHidden;
      unbindVisibility;
      pausedByScreensaver = false;
      speedBeforeScreensaver = 1;
      animationPolicy = new AnimationPolicy();
      constructor(container, options = {}) {
        this.container = container;
        this.debug = options.debug ?? false;
        this.hoverBehavior = options.hoverBehavior ?? "none";
        this.hoverSlowMultiplier = options.hoverSlowMultiplier ?? 0.2;
        this.tapToFreeze = options.tapToFreeze ?? true;
        this.pauseOnScreensaver = options.pauseOnScreensaver ?? false;
        this.performanceMonitor = new PerformanceMonitor();
        const perfSettings = this.performanceMonitor.getRecommendedSettings();
        this.maxImages = options.maxImages ?? perfSettings.maxImages;
        this.intersectionObserver = new IntersectionObserver((entries) => {
          const entry = entries[0];
          if (!entry) return;
          this.isInViewport = !!entry.isIntersecting;
        }, { threshold: 0 });
        this.intersectionObserver.observe(this.container);
        this.setupResizeHandling();
        this.setupScreensaverHandling();
        this.imageLoader = new AsyncImageLoader(this.container);
        this.updateContainerDimensions();
        this.animateCallback = () => this.animate();
        if (!animationLoop.has(this.animateCallback)) {
          animationLoop.add(this.animateCallback);
        }
        this.initializeImages();
        this.log("info", "FloatingImagesManager initialized", {
          container: this.container,
          maxImages: this.maxImages
        });
      }
      log(level, message, data) {
        if (!this.debug && level === "debug") return;
        const payload = { scope: "FloatingImagesManager", level, message, data, time: Date.now() };
        eventBus.emit(EVENTS.FLOATING_IMAGES_LOG, { level, message, data });
        eventBus.emit(EVENTS.LOG, payload);
        if (this.debug) {
          const consoleMethodMap = {
            debug: "debug",
            info: "info",
            warn: "warn",
            error: "error"
          };
          const method = consoleMethodMap[level] ?? "log";
          console[method](`[FloatingImagesManager] [${level.toUpperCase()}]`, message, data);
        }
      }
      setupResizeHandling() {
        this.unsubscribeWindow = resizeManager.onWindow(() => this.handleResize());
        this.unsubscribeElement = resizeManager.onElement(this.container, () => this.handleResize());
      }
      setupScreensaverHandling() {
        if (!this.pauseOnScreensaver) return;
        this.unsubScreensaverShown = eventBus.on(EVENTS.SCREENSAVER_SHOWN, () => {
          if (this.pausedByScreensaver) return;
          this.speedBeforeScreensaver = this.speedMultiplier;
          this.speedMultiplier = 0;
          this.pausedByScreensaver = true;
          this.animationPolicy.set("screensaver", true);
          this.log("debug", "Paused due to screensaver");
        });
        this.unsubScreensaverHidden = eventBus.on(EVENTS.SCREENSAVER_HIDDEN, () => {
          if (!this.pausedByScreensaver) return;
          this.speedMultiplier = this.speedBeforeScreensaver;
          this.pausedByScreensaver = false;
          this.animationPolicy.set("screensaver", false);
          this.log("debug", "Resumed after screensaver");
        });
        const onVisibilityChange = () => {
          this.animationPolicy.set("hidden", document.visibilityState === "hidden");
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        this.unbindVisibility = () => document.removeEventListener("visibilitychange", onVisibilityChange);
      }
      updateContainerDimensions() {
        if (!this.container.isConnected) {
          this.containerWidth = 0;
          this.containerHeight = 0;
          this.log("warn", "Container is not in the DOM, dimensions set to 0");
          return;
        }
        const dims = resizeManager.getElement(this.container);
        this.containerWidth = dims.width;
        this.containerHeight = dims.height;
      }
      async initializeImages() {
        try {
          const imgElements = await this.imageLoader.waitForImagesToLoad(".floating-image");
          const dims = { width: this.containerWidth, height: this.containerHeight };
          imgElements.slice(0, this.maxImages).forEach((el) => {
            if (this._destroyed) return;
            this.addExistingImage(el, dims);
          });
          this.log("info", "Images initialized", { count: this.images.length });
        } catch (err) {
          this.log("error", "Failed to initialize images", err);
        }
      }
      addExistingImage(el, dims) {
        if (this.images.length >= this.maxImages) return;
        const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
        this.images.push(floatingImage);
        this.bindImageInteraction(el);
      }
      handleResize = debounce(() => {
        try {
          if (this._destroyed) return;
          if (!this.container.isConnected) {
            this.log("warn", "Resize event ignored, container not in DOM");
            return;
          }
          this.updateContainerDimensions();
          const dims = { width: this.containerWidth, height: this.containerHeight };
          this.images.forEach((img) => {
            img.updateSize();
            img.clampPosition(dims);
            img.updatePosition();
          });
          this.log("debug", "Container resized", dims);
        } catch (error) {
          this.log("error", "Error during handleResize", error);
        }
      }, 200);
      animate() {
        if (this._destroyed) return;
        if (!this.isInViewport || this.speedMultiplier === 0 || this.animationPolicy.isPaused()) return;
        const skipFrame = this.performanceMonitor.update();
        if (skipFrame) return;
        const multiplier = this.speedMultiplier;
        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images = this.images.filter((img) => {
          const el = img.getElement();
          const imageMultiplier = el ? this.imageSpeedOverrides.get(el) ?? multiplier : multiplier;
          if (imageMultiplier <= 0) {
            return img.updatePosition();
          }
          return img.update(imageMultiplier, dims);
        });
      }
      resetAllImagePositions() {
        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images.forEach((img) => img.resetPosition(dims));
        this.log("debug", "All image positions reset", dims);
      }
      reinitializeImages() {
        try {
          if (this._destroyed) return;
          if (!this.container.isConnected) {
            this.log("warn", "reinitializeImages: container not in DOM, skipping");
            return;
          }
          this.images.forEach((img) => img.destroy());
          this.images.length = 0;
          this.unbindImageInteractions();
          const dims = { width: this.containerWidth, height: this.containerHeight };
          const imgElements = Array.from(this.container.querySelectorAll(".floating-image")).slice(0, this.maxImages);
          imgElements.forEach((el) => {
            const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
            this.images.push(floatingImage);
            this.bindImageInteraction(el);
          });
          this.log("info", "Images reinitialized", { count: this.images.length });
        } catch (error) {
          this.log("error", "Error during reinitializeImages", error);
        }
      }
      destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        if (animationLoop.has(this.animateCallback)) {
          animationLoop.remove(this.animateCallback);
        }
        this.unsubscribeWindow?.();
        this.unsubscribeElement?.();
        this.unsubScreensaverShown?.();
        this.unsubScreensaverHidden?.();
        this.unbindVisibility?.();
        this.unsubscribeWindow = void 0;
        this.unsubscribeElement = void 0;
        this.unsubScreensaverShown = void 0;
        this.unsubScreensaverHidden = void 0;
        this.unbindVisibility = void 0;
        this.intersectionObserver.disconnect();
        this.unbindImageInteractions();
        this.images.forEach((img) => img.destroy());
        this.images.length = 0;
        this.imageLoader.destroy();
        this.containerWidth = 0;
        this.containerHeight = 0;
        this.log("info", "FloatingImagesManager destroyed");
      }
      bindImageInteraction(el) {
        const hoverEnabled = this.hoverBehavior !== "none";
        const touchEnabled = this.tapToFreeze;
        if (!hoverEnabled && !touchEnabled) return;
        const onPointerEnter = () => {
          if (this.hoverBehavior === "none") return;
          if (this.frozenElements.has(el)) return;
          if (this.hoverBehavior === "stop") {
            this.imageSpeedOverrides.set(el, 0);
            return;
          }
          this.imageSpeedOverrides.set(el, this.hoverSlowMultiplier);
        };
        const onPointerLeave = () => {
          if (this.frozenElements.has(el)) return;
          this.imageSpeedOverrides.delete(el);
        };
        const onPointerUp = (event) => {
          if (!this.tapToFreeze || event.pointerType !== "touch") return;
          if (this.frozenElements.has(el)) {
            this.frozenElements.delete(el);
            this.imageSpeedOverrides.delete(el);
            return;
          }
          this.frozenElements.add(el);
          this.imageSpeedOverrides.set(el, 0);
        };
        el.addEventListener("pointerenter", onPointerEnter);
        el.addEventListener("pointerleave", onPointerLeave);
        el.addEventListener("pointerup", onPointerUp);
        this.interactionCleanups.push(() => {
          el.removeEventListener("pointerenter", onPointerEnter);
          el.removeEventListener("pointerleave", onPointerLeave);
          el.removeEventListener("pointerup", onPointerUp);
          this.imageSpeedOverrides.delete(el);
        });
      }
      unbindImageInteractions() {
        this.interactionCleanups.forEach((unsub) => unsub());
        this.interactionCleanups = [];
        this.frozenElements = /* @__PURE__ */ new WeakSet();
        this.imageSpeedOverrides = /* @__PURE__ */ new WeakMap();
      }
    };
  }
});

// src/system/features/Screensaver/ScreensaverController.ts
var ScreensaverController_exports = {};
__export(ScreensaverController_exports, {
  ScreensaverController: () => ScreensaverController,
  VERSION: () => VERSION4
});
var VERSION4, ScreensaverController;
var init_ScreensaverController = __esm({
  "src/system/features/Screensaver/ScreensaverController.ts"() {
    "use strict";
    init_EventBus();
    init_EventBinder();
    init_InactivityWatcher();
    init_PartialFetcher();
    init_FloatingImagesManager();
    init_events();
    VERSION4 = "2.0.0";
    ScreensaverController = class _ScreensaverController {
      static STATES = {
        IDLE: "idle",
        LOADING: "loading",
        VISIBLE: "visible",
        HIDING: "hiding",
        DESTROYED: "destroyed"
      };
      partialUrl;
      targetSelector;
      inactivityDelay;
      debug;
      onError;
      screensaverManager = null;
      watcher = null;
      _destroyed = false;
      eventBinder;
      _partialLoaded = false;
      partialFetcher;
      // avoid duplicate concurrent partial loads
      _loadPromise;
      _hideTimeout = null;
      _bound = false;
      state = _ScreensaverController.STATES.IDLE;
      _onInactivity;
      _onActivity;
      constructor(options) {
        this.partialUrl = options.partialUrl;
        this.targetSelector = options.targetSelector;
        this.inactivityDelay = options.inactivityDelay ?? 12e3;
        this.debug = !!options.debug;
        this.watcher = options.watcher ?? null;
        this.partialFetcher = options.partialFetcher ?? PartialFetcher;
        this.onError = options.onError;
        this.eventBinder = new EventBinder(this.debug);
        this._onInactivity = this.showScreensaver.bind(this);
        this._onActivity = this.hideScreensaver.bind(this);
        this.log("info", "ScreensaverController initialized", {
          partialUrl: this.partialUrl,
          targetSelector: this.targetSelector,
          inactivityDelay: this.inactivityDelay
        });
      }
      /** Centralized logging with debug and level support */
      log(level, message, data) {
        if (!this.debug && level === "debug") return;
        const payload = { scope: "ScreensaverController", level, message, data, time: Date.now() };
        eventBus.emit(EVENTS.SCREENSAVER_LOG, { level, message, data });
        eventBus.emit(EVENTS.LOG, payload);
        if (this.debug) {
          const consoleMethodMap = {
            debug: "debug",
            info: "info",
            warn: "warn",
            error: "error"
          };
          const method = consoleMethodMap[level] ?? "log";
          console[method](`[ScreensaverController] [${level.toUpperCase()}]`, message, data);
        }
      }
      async init() {
        if (this._destroyed) return;
        if (this._bound) return;
        try {
          if (!this.watcher) {
            this.watcher = InactivityWatcher.getInstance({
              inactivityDelay: this.inactivityDelay
            });
          }
          this.eventBinder.bindBus(EVENTS.USER_INACTIVE, this._onInactivity);
          this.eventBinder.bindBus(EVENTS.USER_ACTIVE, this._onActivity);
          this._bound = true;
          this.log("info", "Bound user inactivity/active events");
        } catch (error) {
          this.handleError("Failed to initialize inactivity watcher", error);
        }
      }
      async showScreensaver() {
        if (this._destroyed) return;
        if (this.state === _ScreensaverController.STATES.VISIBLE || this.state === _ScreensaverController.STATES.LOADING) return;
        try {
          this.state = _ScreensaverController.STATES.LOADING;
          if (!this._partialLoaded) {
            if (!this._loadPromise) {
              this._loadPromise = this.partialFetcher.load(this.partialUrl, this.targetSelector).then(() => {
                this._partialLoaded = true;
              }).finally(() => {
                this._loadPromise = void 0;
              });
            }
            await this._loadPromise;
          }
          const container = document.querySelector(this.targetSelector);
          if (!container) {
            this.state = _ScreensaverController.STATES.IDLE;
            this.handleError(`Target selector "${this.targetSelector}" not found`, null);
            return;
          }
          container.style.opacity = "0";
          container.style.display = "";
          void container.offsetWidth;
          container.style.transition = "opacity 0.5s ease";
          container.style.opacity = "1";
          if (!this.screensaverManager) {
            this.screensaverManager = new FloatingImagesManager(container, { debug: this.debug });
          } else {
            this.screensaverManager.destroy();
            this.screensaverManager = new FloatingImagesManager(container, { debug: this.debug });
          }
          this.state = _ScreensaverController.STATES.VISIBLE;
          eventBus.emit(EVENTS.SCREENSAVER_SHOWN, { targetSelector: this.targetSelector });
          this.log("info", "Screensaver displayed");
        } catch (error) {
          this.state = _ScreensaverController.STATES.IDLE;
          this.handleError("Failed to load or show screensaver", error);
        }
      }
      hideScreensaver() {
        if (this._destroyed) return;
        if (this.state === _ScreensaverController.STATES.IDLE || this.state === _ScreensaverController.STATES.HIDING) return;
        try {
          this.state = _ScreensaverController.STATES.HIDING;
          const container = document.querySelector(this.targetSelector);
          if (container) {
            container.style.transition = "opacity 0.5s ease";
            container.style.opacity = "0";
            if (this._hideTimeout) {
              clearTimeout(this._hideTimeout);
            }
            this._hideTimeout = window.setTimeout(() => {
              container.style.display = "none";
              this.state = _ScreensaverController.STATES.IDLE;
              this._hideTimeout = null;
            }, 500);
          } else {
            this.state = _ScreensaverController.STATES.IDLE;
          }
          eventBus.emit(EVENTS.SCREENSAVER_HIDDEN, { targetSelector: this.targetSelector });
          this.log("debug", "Screensaver hidden");
        } catch (error) {
          this.state = _ScreensaverController.STATES.IDLE;
          this.handleError("Failed to hide screensaver", error);
        }
      }
      destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this.state = _ScreensaverController.STATES.DESTROYED;
        this.hideScreensaver();
        try {
          this.screensaverManager?.destroy();
        } catch (err) {
          this.log("warn", "screensaverManager.destroy() failed", err);
        }
        this.eventBinder.unbindAll();
        this._partialLoaded = false;
        if (this._hideTimeout) {
          clearTimeout(this._hideTimeout);
          this._hideTimeout = null;
        }
        this._loadPromise = void 0;
        this._bound = false;
        this.log("info", "ScreensaverController destroyed");
      }
      handleError(message, error) {
        eventBus.emit(EVENTS.SCREENSAVER_ERROR, { message, error });
        this.onError?.(message, error);
        this.log("error", message, error);
      }
    };
  }
});

// src/system/bin/DomReadyPromise.ts
var DomReadyPromise = class {
  /** Cached promise that resolves once the DOM is ready */
  static #readyPromise = null;
  /**
   * Returns a promise that resolves when the DOM is fully loaded.
   */
  static ready() {
    if (!this.#readyPromise) {
      this.#readyPromise = document.readyState !== "loading" ? Promise.resolve() : new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
      });
    }
    return this.#readyPromise;
  }
  /**
   * Waits for one or more DOM elements to appear in the document.
   */
  static waitForElement(selectors, options = {}) {
    const { timeout = 5e3, root = document, signal } = options;
    if (timeout <= 0) {
      return Promise.reject(new TypeError("Timeout must be greater than 0"));
    }
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    const foundElements = /* @__PURE__ */ new Map();
    return new Promise((resolve, reject) => {
      let timeoutId;
      const checkForElements = () => {
        for (const selector of selectorList) {
          if (!foundElements.has(selector)) {
            const el = root.querySelector(selector);
            if (el) foundElements.set(selector, el);
          }
        }
        if (foundElements.size === selectorList.length) {
          cleanup();
          resolve(selectorList.length === 1 ? foundElements.get(selectorList[0]) : Array.from(foundElements.values()));
        }
      };
      const observer = new MutationObserver(checkForElements);
      const cleanup = () => {
        observer.disconnect();
        if (timeoutId !== void 0) clearTimeout(timeoutId);
        signal?.removeEventListener("abort", onAbort);
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException("waitForElement aborted", "AbortError"));
      };
      if (signal?.aborted) return onAbort();
      signal?.addEventListener("abort", onAbort, { once: true });
      observer.observe(root, { childList: true, subtree: true });
      checkForElements();
      timeoutId = window.setTimeout(() => {
        cleanup();
        const missing = selectorList.filter((s) => !foundElements.has(s));
        reject(new DOMException(
          `Element(s) "${missing.join(", ")}" not found within ${timeout}ms in root: ${root.nodeName}`,
          "TimeoutError"
        ));
      }, timeout);
    });
  }
};

// src/app/symlink.ts
init_InactivityWatcher();
init_EventBus();
init_EventBinder();
init_EventWatcher();
init_PartialFetcher();
init_PartialLoader();

// src/system/bin/generateId.ts
function generateId(prefix = "id", length = 9, useCrypto = false) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new Error("Length must be a positive integer.");
  }
  const randomString = useCrypto ? Array.from(crypto.getRandomValues(new Uint8Array(length))).map((byte) => (byte % 36).toString(36)).join("") : Math.random().toString(36).slice(2, 2 + length);
  return `${prefix}-${randomString}`;
}

// src/app/spaceface.core.ts
init_events();
var AppConfig = class {
  config;
  constructor(options = {}) {
    this.config = {
      hostname: options.hostname ?? window.location.hostname,
      production: options.production ?? (window.location.hostname !== "localhost" && !window.location.hostname.includes("127.0.0.1")),
      features: options.features ?? {},
      ...options
    };
  }
};
var SpacefaceCore = class _SpacefaceCore {
  static EVENT_LOG = EVENTS.LOG;
  static EVENT_TELEMETRY = EVENTS.TELEMETRY;
  appConfig;
  debug;
  pageType;
  startTime;
  featureModules;
  featureCache = /* @__PURE__ */ new Map();
  inactivityWatcher = null;
  screensaverController = null;
  slideshows = [];
  floatingImagesManagers = [];
  _partialUnsub;
  _partialObserver;
  pjaxFeatures = /* @__PURE__ */ new Map();
  managedFeatures = [];
  onceFeatures = [];
  constructor(options = {}) {
    this.appConfig = new AppConfig(options);
    this.appConfig.config.features = this.normalizeFeaturesConfig(this.appConfig.config.features);
    this.debug = !!this.appConfig.config.debug;
    this.pageType = this.resolvePageType();
    this.startTime = performance.now();
    this.featureModules = {
      partialLoader: () => Promise.resolve().then(() => (init_PartialLoader(), PartialLoader_exports)),
      slideplayer: () => Promise.resolve().then(() => (init_SlidePlayer(), SlidePlayer_exports)),
      screensaver: () => Promise.resolve().then(() => (init_ScreensaverController(), ScreensaverController_exports)),
      floatingImages: () => Promise.resolve().then(() => (init_FloatingImagesManager(), FloatingImagesManager_exports))
    };
    if (!this.appConfig.config.features) {
      this.log("warn", "No features specified in config");
    }
    this.setupManagedFeatures();
    this.setupOnceFeatures();
  }
  log(level, ...args) {
    if (!this.debug && level === "debug") return;
    const [first, ...rest] = args;
    const message = typeof first === "string" ? first : "";
    const data = typeof first === "string" ? rest.length ? rest : void 0 : args.length ? args : void 0;
    const payload = {
      level,
      args,
      scope: "Spaceface",
      message,
      data,
      time: Date.now()
    };
    eventBus.emit(_SpacefaceCore.EVENT_LOG, payload);
    if (this.debug) {
      console[level]?.(`[spaceface] [${level.toUpperCase()}]`, ...args);
    }
  }
  resolvePageType() {
    const body = document.body;
    if (body.dataset.page) return body.dataset.page;
    const rawPath = window.location.pathname;
    const path = rawPath.replace(/\/+$/, "") || "/";
    if (path === "/") return "home";
    const segment = path.split("/").filter(Boolean).pop() ?? "default";
    return segment.replace(/\.html$/i, "").replace(/^_+/, "") || "default";
  }
  async loadFeatureModule(name) {
    if (this.featureCache.has(name)) return this.featureCache.get(name);
    try {
      const module = await this.featureModules[name]?.();
      if (!module) {
        throw new Error(`Module "${name}" could not be loaded.`);
      }
      this.featureCache.set(name, module);
      return module;
    } catch (err) {
      this.log("error", `Failed to load module "${name}"`, err);
      this.featureCache.set(name, null);
      return null;
    }
  }
  async initBase() {
    this.log("info", `App initialization started (Page: ${this.pageType})`);
    document.documentElement.classList.add("js-enabled", `page-${this.pageType}`);
    await DomReadyPromise.ready();
    this.log("info", "DOM ready");
  }
  finishInit() {
    const duration = (performance.now() - this.startTime).toFixed(2);
    this.log("info", `App initialized in ${duration}ms`);
    eventBus.emit(_SpacefaceCore.EVENT_TELEMETRY, {
      type: "init:duration",
      value: duration,
      page: this.pageType
    });
  }
  async initInactivityWatcher() {
    const start = performance.now();
    const screensaver = this.appConfig.config.features.screensaver;
    if (!screensaver || this.inactivityWatcher) {
      this.emitFeatureTelemetry("inactivityWatcher", start, "skipped");
      return;
    }
    try {
      this.inactivityWatcher = InactivityWatcher.getInstance({
        inactivityDelay: screensaver.delay ?? 3e3
      });
      this.log("debug", `InactivityWatcher initialized with delay=${screensaver.delay ?? 3e3}ms`);
      this.emitFeatureTelemetry("inactivityWatcher", start, "success");
    } catch (error) {
      this.emitFeatureTelemetry("inactivityWatcher", start, "error", error);
      throw error;
    }
  }
  async initSlidePlayer() {
    const start = performance.now();
    const slideplayer = this.appConfig.config.features.slideplayer;
    if (!slideplayer) {
      this.emitFeatureTelemetry("slideplayer", start, "skipped");
      return;
    }
    try {
      const module = await this.loadFeatureModule("slideplayer");
      const SlidePlayer2 = module?.SlidePlayer;
      if (!SlidePlayer2) {
        this.emitFeatureTelemetry("slideplayer", start, "skipped");
        return;
      }
      this.slideshows = Array.from(document.querySelectorAll(".slideshow-container")).map((node) => {
        const slideshow = new SlidePlayer2(node, {
          interval: slideplayer.interval ?? 5e3,
          includePicture: slideplayer.includePicture ?? false
        });
        slideshow.ready?.then?.(() => {
        });
        return slideshow;
      });
      this.log("info", `${this.slideshows.length} SlidePlayer instance(s) loaded`);
      this.emitFeatureTelemetry("slideplayer", start, "success");
    } catch (error) {
      this.emitFeatureTelemetry("slideplayer", start, "error", error);
      throw error;
    }
  }
  async initScreensaver() {
    const start = performance.now();
    const screensaver = this.appConfig.config.features.screensaver;
    if (!screensaver?.partialUrl) {
      this.log("error", "Screensaver configuration is missing or incomplete");
      this.emitFeatureTelemetry("screensaver", start, "skipped");
      return;
    }
    try {
      const module = await this.loadFeatureModule("screensaver");
      const ScreensaverController2 = module?.ScreensaverController;
      if (!ScreensaverController2) {
        throw new Error("ScreensaverController module is unavailable.");
      }
      const id = generateId("screensaver", 9);
      const container = Object.assign(document.createElement("div"), {
        id,
        style: "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999; display: none;"
      });
      document.body.appendChild(container);
      this.screensaverController = new ScreensaverController2({
        partialUrl: screensaver.partialUrl,
        targetSelector: `#${id}`,
        ...screensaver.delay !== void 0 && { inactivityDelay: screensaver.delay }
      });
      await this.screensaverController?.init?.();
      eventBus.emit(EVENTS.SCREENSAVER_INITIALIZED, id);
      this.log("info", "Screensaver initialized:", id);
      this.emitFeatureTelemetry("screensaver", start, "success");
    } catch (error) {
      this.log("error", "Failed to initialize screensaver:", error);
      this.emitFeatureTelemetry("screensaver", start, "error", error);
    }
  }
  async initPartialLoader() {
    const start = performance.now();
    const config = this.appConfig.config.features.partialLoader;
    if (!config?.enabled) {
      this.emitFeatureTelemetry("partialLoader", start, "skipped");
      return null;
    }
    try {
      const module = await this.loadFeatureModule("partialLoader");
      const PartialLoader2 = module?.PartialLoader;
      if (!PartialLoader2) {
        this.emitFeatureTelemetry("partialLoader", start, "skipped");
        return null;
      }
      const loader = new PartialLoader2({
        debug: config.debug ?? this.debug,
        baseUrl: config.baseUrl ?? "/",
        cacheEnabled: config.cacheEnabled ?? true,
        timeout: config.timeout,
        retryAttempts: config.retryAttempts
      });
      await loader.loadContainer(document);
      const watchResult = loader.watch?.(document);
      if (typeof watchResult === "function") {
        this._partialUnsub = watchResult;
      } else if (watchResult) {
        this._partialObserver = watchResult;
      }
      this.log("info", "PartialLoader initialized");
      this.emitFeatureTelemetry("partialLoader", start, "success");
      return loader;
    } catch (error) {
      this.emitFeatureTelemetry("partialLoader", start, "error", error);
      throw error;
    }
  }
  async initDomFeatures() {
    await this.runFeatureGraph(this.managedFeatures, "init");
  }
  async initOnceFeatures() {
    await this.runFeatureGraph(this.onceFeatures, "init");
    this.log("info", `Page features initialized for: ${this.pageType}`);
  }
  registerPjaxFeature(name, init, when) {
    if (this.pjaxFeatures.has(name)) return;
    this.pjaxFeatures.set(name, { init, when });
  }
  async handlePjaxComplete() {
    this.pageType = this.resolvePageType();
    document.documentElement.classList.add(`page-${this.pageType}`);
    await this.runFeatureGraph(this.managedFeatures, "onRouteChange");
    for (const { init, when } of this.pjaxFeatures.values()) {
      if (when && !when(this.pageType)) continue;
      await init();
    }
  }
  destroy() {
    this._partialUnsub?.();
    this._partialObserver?.disconnect?.();
    this.managedFeatures.forEach((feature) => feature.destroy());
    this.onceFeatures.forEach((feature) => feature.destroy());
    this.featureCache.clear();
    document.querySelector('[id^="screensaver"]')?.remove();
    this.log("info", "Spaceface destroyed, all resources released.");
  }
  emitFeatureTelemetry(feature, startTime, status, error) {
    const duration = (performance.now() - startTime).toFixed(2);
    eventBus.emit(_SpacefaceCore.EVENT_TELEMETRY, {
      type: "feature:init",
      feature,
      status,
      duration,
      page: this.pageType,
      error
    });
  }
  async initFloatingImages() {
    const start = performance.now();
    const floatingImages = this.appConfig.config.features.floatingImages;
    if (!floatingImages) {
      this.emitFeatureTelemetry("floatingImages", start, "skipped");
      return;
    }
    try {
      const module = await this.loadFeatureModule("floatingImages");
      const FloatingImagesManager2 = module?.FloatingImagesManager;
      if (!FloatingImagesManager2) {
        this.emitFeatureTelemetry("floatingImages", start, "skipped");
        return;
      }
      const selector = floatingImages.selector ?? ".floating-images-container";
      const containers = Array.from(document.querySelectorAll(selector));
      if (!containers.length) {
        this.emitFeatureTelemetry("floatingImages", start, "skipped");
        return;
      }
      this.destroyFloatingImagesManagers();
      const shouldPauseOnScreensaver = floatingImages.pauseOnScreensaver ?? this.pageType === "floatingimages";
      this.floatingImagesManagers = containers.map((container) => {
        return new FloatingImagesManager2(container, {
          maxImages: floatingImages.maxImages,
          debug: floatingImages.debug ?? this.debug,
          hoverBehavior: floatingImages.hoverBehavior ?? "none",
          hoverSlowMultiplier: floatingImages.hoverSlowMultiplier ?? 0.2,
          tapToFreeze: floatingImages.tapToFreeze ?? true,
          pauseOnScreensaver: shouldPauseOnScreensaver
        });
      });
      this.log("info", `${this.floatingImagesManagers.length} FloatingImages instance(s) loaded`);
      this.emitFeatureTelemetry("floatingImages", start, "success");
    } catch (error) {
      this.emitFeatureTelemetry("floatingImages", start, "error", error);
      throw error;
    }
  }
  destroyFloatingImagesManagers() {
    this.floatingImagesManagers.forEach((manager) => manager.destroy?.());
    this.floatingImagesManagers = [];
  }
  destroySlidePlayers() {
    this.slideshows.forEach((slideshow) => slideshow.destroy?.());
    this.slideshows = [];
  }
  setupManagedFeatures() {
    this.managedFeatures = [
      {
        name: "slideplayer",
        dependsOn: [],
        init: () => this.initSlidePlayer(),
        onRouteChange: async () => {
          this.destroySlidePlayers();
          await this.initSlidePlayer();
        },
        destroy: () => this.destroySlidePlayers()
      },
      {
        name: "floatingImages",
        dependsOn: [],
        init: () => this.initFloatingImages(),
        onRouteChange: async () => {
          this.destroyFloatingImagesManagers();
          await this.initFloatingImages();
        },
        destroy: () => this.destroyFloatingImagesManagers()
      }
    ];
  }
  setupOnceFeatures() {
    this.onceFeatures = [
      {
        name: "inactivityWatcher",
        dependsOn: [],
        init: () => this.initInactivityWatcher(),
        destroy: () => this.inactivityWatcher?.destroy?.()
      },
      {
        name: "screensaver",
        dependsOn: ["inactivityWatcher"],
        init: () => this.initScreensaver(),
        destroy: () => this.screensaverController?.destroy?.()
      }
    ];
  }
  async runFeatureGraph(features2, stage) {
    const pending = new Map(features2.map((feature) => [feature.name, feature]));
    const completed = /* @__PURE__ */ new Set();
    let guard = 0;
    while (pending.size) {
      guard++;
      if (guard > features2.length * 2) {
        throw new Error("Feature dependency graph contains a cycle or unresolved dependency.");
      }
      let progressed = false;
      for (const [name, feature] of Array.from(pending.entries())) {
        const deps = feature.dependsOn ?? [];
        if (!deps.every((dep) => completed.has(dep))) continue;
        if (stage === "onRouteChange" && feature.onRouteChange) {
          await feature.onRouteChange(this.pageType);
        } else {
          await feature.init();
        }
        pending.delete(name);
        completed.add(name);
        progressed = true;
      }
      if (!progressed) {
        const unresolved = Array.from(pending.keys()).join(", ");
        throw new Error(`Unresolved feature dependencies: ${unresolved}`);
      }
    }
  }
  getFeatureSnapshot() {
    return {
      pageType: this.pageType,
      managedFeatures: this.managedFeatures.map((f) => f.name),
      onceFeatures: this.onceFeatures.map((f) => f.name),
      activeSlidePlayers: this.slideshows.length,
      activeFloatingImagesManagers: this.floatingImagesManagers.length,
      inactivityWatcherReady: !!this.inactivityWatcher,
      screensaverReady: !!this.screensaverController,
      partialLoaderWatching: !!(this._partialUnsub || this._partialObserver)
    };
  }
  normalizeFeaturesConfig(features2) {
    const normalized = { ...features2 };
    const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
    if (normalized.slideplayer) {
      if (normalized.slideplayer.interval !== void 0 && !isPositiveNumber(normalized.slideplayer.interval)) {
        this.log("warn", "Invalid slideplayer.interval; expected positive number. Falling back to default.");
        delete normalized.slideplayer.interval;
      }
    }
    if (normalized.screensaver) {
      if (typeof normalized.screensaver.partialUrl !== "string" || !normalized.screensaver.partialUrl.trim()) {
        this.log("warn", "Invalid screensaver.partialUrl; disabling screensaver feature.");
        delete normalized.screensaver;
      } else if (normalized.screensaver.delay !== void 0 && !isPositiveNumber(normalized.screensaver.delay)) {
        this.log("warn", "Invalid screensaver.delay; removing delay override.");
        delete normalized.screensaver.delay;
      }
    }
    if (normalized.floatingImages) {
      if (normalized.floatingImages.maxImages !== void 0 && !isPositiveNumber(normalized.floatingImages.maxImages)) {
        this.log("warn", "Invalid floatingImages.maxImages; removing override.");
        delete normalized.floatingImages.maxImages;
      }
      if (normalized.floatingImages.hoverSlowMultiplier !== void 0 && (typeof normalized.floatingImages.hoverSlowMultiplier !== "number" || normalized.floatingImages.hoverSlowMultiplier < 0)) {
        this.log("warn", "Invalid floatingImages.hoverSlowMultiplier; removing override.");
        delete normalized.floatingImages.hoverSlowMultiplier;
      }
      if (normalized.floatingImages.selector !== void 0 && typeof normalized.floatingImages.selector !== "string") {
        this.log("warn", "Invalid floatingImages.selector; removing override.");
        delete normalized.floatingImages.selector;
      }
    }
    if (normalized.partialLoader) {
      if (normalized.partialLoader.timeout !== void 0 && !isPositiveNumber(normalized.partialLoader.timeout)) {
        this.log("warn", "Invalid partialLoader.timeout; removing override.");
        delete normalized.partialLoader.timeout;
      }
      if (normalized.partialLoader.retryAttempts !== void 0 && !isPositiveNumber(normalized.partialLoader.retryAttempts)) {
        this.log("warn", "Invalid partialLoader.retryAttempts; removing override.");
        delete normalized.partialLoader.retryAttempts;
      }
    }
    return normalized;
  }
};

// src/app/pjax.ts
var Pjax = class {
  containerSelector;
  linkSelector;
  scrollToTop;
  cacheEnabled;
  cache = /* @__PURE__ */ new Map();
  currentRequest;
  constructor(options = {}) {
    this.containerSelector = options.containerSelector ?? '[data-pjax="container"]';
    this.linkSelector = options.linkSelector ?? "a[href]";
    this.scrollToTop = options.scrollToTop ?? true;
    this.cacheEnabled = options.cache ?? true;
  }
  init() {
    document.addEventListener("click", this.onClick, true);
    window.addEventListener("popstate", this.onPopState);
  }
  destroy() {
    document.removeEventListener("click", this.onClick, true);
    window.removeEventListener("popstate", this.onPopState);
    this.currentRequest?.abort();
    this.currentRequest = void 0;
  }
  onClick = (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    const link = target?.closest?.(this.linkSelector);
    if (!link) return;
    if (link.hasAttribute("download")) return;
    if (link.getAttribute("rel") === "external") return;
    if (link.target && link.target !== "_self") return;
    if (link.dataset.noPjax !== void 0) return;
    const href = link.href;
    if (!href) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) {
      return;
    }
    event.preventDefault();
    void this.load(url.toString(), true);
  };
  onPopState = () => {
    void this.load(window.location.href, false);
  };
  async load(url, pushState) {
    const container = document.querySelector(this.containerSelector);
    if (!container) {
      document.dispatchEvent(new CustomEvent("pjax:error", { detail: { url, error: new Error("PJAX container not found") } }));
      window.location.href = url;
      return;
    }
    this.currentRequest?.abort();
    const controller = new AbortController();
    this.currentRequest = controller;
    const requestToken = controller;
    container.setAttribute("data-pjax-loading", "true");
    document.dispatchEvent(new CustomEvent("pjax:before", { detail: { url } }));
    try {
      const cached = this.cacheEnabled ? this.cache.get(url) : void 0;
      let title;
      let html;
      if (cached) {
        ({ title, html } = cached);
      } else {
        const res = await fetch(url, {
          method: "GET",
          headers: { "X-PJAX": "true" },
          signal: controller.signal,
          credentials: "same-origin"
        });
        if (!res.ok) throw new Error(`PJAX HTTP ${res.status}`);
        const text = await res.text();
        const parsed = new DOMParser().parseFromString(text, "text/html");
        const nextContainer = parsed.querySelector(this.containerSelector);
        if (!nextContainer) throw new Error(`PJAX container "${this.containerSelector}" not found`);
        title = parsed.title || document.title;
        html = nextContainer.innerHTML;
        if (this.cacheEnabled) {
          this.cache.set(url, { title, html, url });
        }
      }
      if (this.currentRequest !== requestToken) return;
      container.innerHTML = html;
      document.title = title;
      if (pushState) {
        history.pushState({ pjax: true }, "", url);
      }
      if (this.scrollToTop) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
      document.dispatchEvent(new CustomEvent("pjax:complete", { detail: { url } }));
    } catch (error) {
      if (error?.name !== "AbortError") {
        document.dispatchEvent(new CustomEvent("pjax:error", { detail: { url, error } }));
        window.location.href = url;
      }
    } finally {
      container.removeAttribute("data-pjax-loading");
    }
  }
};
function initPjax(options = {}) {
  const pjax = new Pjax(options);
  pjax.init();
  return pjax;
}

// src/app/main.pjax.ts
var features = {
  slideplayer: { interval: 5e3, includePicture: false },
  floatingImages: {
    selector: ".floating-images-container",
    maxImages: 24,
    debug: false,
    hoverBehavior: "slow",
    hoverSlowMultiplier: 0.2,
    tapToFreeze: true
  },
  screensaver: { delay: 4500, partialUrl: "content/feature/screensaver/index.html" }
};
var app = new SpacefaceCore({
  features
});
app.initBase().then(async () => {
  await app.initDomFeatures();
  await app.initOnceFeatures();
  app.finishInit();
  initPjax({ containerSelector: '[data-pjax="container"]' });
  document.addEventListener("pjax:complete", () => {
    void app.handlePjaxComplete();
  });
});
window.addEventListener("beforeunload", () => {
  app.destroy();
  app.log("info", "App destroyed on beforeunload");
});
//# sourceMappingURL=bundle.js.map
