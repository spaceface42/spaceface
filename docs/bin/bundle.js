var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/system/bin/EventWatcher.ts
var EventWatcher;
var init_EventWatcher = __esm({
  "src/system/bin/EventWatcher.ts"() {
    "use strict";
    EventWatcher = class {
      target;
      debug;
      listening = false;
      destroyed = false;
      // DOM listeners storage
      domListeners = [];
      constructor(target, debug = false) {
        if (!(target instanceof EventTarget)) {
          throw new Error(`${this.constructor.name}: target must be a valid EventTarget.`);
        }
        this.target = target;
        this.debug = debug;
      }
      log(...args) {
        if (this.debug) console.log(`[${this.constructor.name}]`, ...args);
      }
      checkDestroyed() {
        if (this.destroyed) {
          throw new Error(`${this.constructor.name} has been destroyed.`);
        }
      }
      destroy() {
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
      addDomListener(type, handler) {
        this.target.addEventListener(type, handler);
        this.domListeners.push({ type, handler });
      }
      /** Remove all stored DOM listeners */
      removeAllDomListeners() {
        for (const { type, handler } of this.domListeners) {
          this.target.removeEventListener(type, handler);
        }
        this.domListeners = [];
      }
    };
  }
});

// src/system/bin/EventBus.ts
var EventBus, eventBus;
var init_EventBus = __esm({
  "src/system/bin/EventBus.ts"() {
    "use strict";
    EventBus = class {
      listeners = {};
      anyListeners = [];
      onceWrappers = /* @__PURE__ */ new WeakMap();
      on(event, fn, priority = 0) {
        const list = this.listeners[event] ??= [];
        const listener = { fn, priority };
        let i = list.length;
        while (i > 0 && list[i - 1].priority < priority) i--;
        list.splice(i, 0, listener);
        return () => this.off(event, fn);
      }
      once(event, fn, priority = 0) {
        const wrapper = (payload) => {
          this.off(event, wrapper);
          fn(payload);
        };
        this.onceWrappers.set(fn, wrapper);
        this.on(event, wrapper, priority);
      }
      onAny(fn, priority = 0) {
        const listener = { fn, priority };
        let i = this.anyListeners.length;
        while (i > 0 && this.anyListeners[i - 1].priority < priority) i--;
        this.anyListeners.splice(i, 0, listener);
        return () => this.offAny(fn);
      }
      off(event, fn) {
        const list = this.listeners[event];
        if (!list) return;
        const wrapper = this.onceWrappers.get(fn) ?? fn;
        this.listeners[event] = list.filter((l) => l.fn !== wrapper);
      }
      offAny(fn) {
        this.anyListeners = this.anyListeners.filter((l) => l.fn !== fn);
      }
      emit(event, payload) {
        if (!event) return this._handleError("Event name is undefined or empty", new Error());
        const list = this.listeners[event] ?? [];
        for (const l of list) {
          try {
            l.fn(payload);
          } catch (err) {
            this._handleError(`Error in listener for "${event}"`, err);
          }
        }
        for (const l of this.anyListeners) {
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
        const list = this.listeners[event] ?? [];
        for (const l of list) {
          try {
            results.push(await l.fn(payload));
          } catch (err) {
            this._handleError(`Async error in listener for "${event}"`, err);
          }
        }
        for (const l of this.anyListeners) {
          try {
            results.push(await l.fn(event, payload));
          } catch (err) {
            this._handleError(`Async error in any-listener for "${event}"`, err);
          }
        }
        return results;
      }
      removeAllListeners(event) {
        if (!event) {
          this.listeners = {};
          this.anyListeners = [];
        } else if (event === "any") {
          this.anyListeners = [];
        } else {
          delete this.listeners[event];
        }
      }
      hasListeners(event) {
        return event === "any" ? this.anyListeners.length > 0 : (this.listeners[event]?.length ?? 0) > 0;
      }
      listenerCount(event) {
        return event === "any" ? this.anyListeners.length : this.listeners[event]?.length ?? 0;
      }
      eventNames() {
        return Object.keys(this.listeners).filter((e) => this.listeners[e].length > 0);
      }
      getListeners(event) {
        return event === "any" ? this.anyListeners.map((l) => l.fn) : (this.listeners[event] ?? []).map((l) => l.fn);
      }
      _handleError(message, error) {
        console.error(message, error);
        if (message.includes("eventbus:error")) return;
        try {
          this.emit("eventbus:error", { message, error });
        } catch (e) {
          console.error('EventBus failed to emit "eventbus:error":', e);
        }
      }
    };
    eventBus = new EventBus();
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

// src/system/bin/InactivityWatcher.ts
var InactivityWatcher;
var init_InactivityWatcher = __esm({
  "src/system/bin/InactivityWatcher.ts"() {
    "use strict";
    init_EventWatcher();
    init_EventBus();
    init_timing();
    InactivityWatcher = class _InactivityWatcher extends EventWatcher {
      static _instance = null;
      inactivityDelay;
      lastActiveAt;
      timer;
      userIsInactive = false;
      constructor(target, options) {
        super(target, options.debug ?? false);
        this.inactivityDelay = options.inactivityDelay;
        this.lastActiveAt = Date.now();
        this.log(`Initialized with inactivityDelay=${this.inactivityDelay}ms`);
        this.addEventListeners();
      }
      static getInstance(options) {
        if (!this._instance) {
          this._instance = new _InactivityWatcher(options.target ?? document, options);
        }
        return this._instance;
      }
      addEventListeners() {
        const throttledReset = throttle(() => this.resetTimer(), 200);
        this.target.addEventListener("mousemove", throttledReset);
        this.target.addEventListener("keydown", throttledReset);
        this.target.addEventListener("scroll", throttledReset);
        this.target.addEventListener("visibilitychange", throttledReset);
        this.resetTimer();
      }
      removeEventListeners() {
        this.target.removeEventListener("mousemove", this.resetTimer);
        this.target.removeEventListener("keydown", this.resetTimer);
        this.target.removeEventListener("scroll", this.resetTimer);
        this.target.removeEventListener("visibilitychange", this.resetTimer);
        if (this.timer) clearTimeout(this.timer);
      }
      resetTimer() {
        const now = Date.now();
        this.lastActiveAt = now;
        if (this.userIsInactive) {
          this.userIsInactive = false;
          eventBus.emit("user:active", {
            lastActiveAt: this.lastActiveAt,
            inactivityDelay: this.inactivityDelay,
            visible: document.visibilityState === "visible"
          });
          this.log("User is active");
        }
        if (this.timer) clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.setInactive(), this.inactivityDelay);
      }
      setInactive() {
        this.userIsInactive = true;
        const now = Date.now();
        eventBus.emit("user:inactive", {
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

// src/system/bin/EventBinder.ts
var EventBinder, eventBinder;
var init_EventBinder = __esm({
  "src/system/bin/EventBinder.ts"() {
    "use strict";
    init_EventBus();
    EventBinder = class _EventBinder {
      IBusBindings = [];
      domBindings = [];
      debugMode;
      /**
       * Create a new EventBinder.
       * @param debug Enable debug logging (emits `debug:EventBinder` events)
       */
      constructor(debug = false) {
        this.debugMode = debug;
      }
      /** Emit debug info via EventBus if debug mode is enabled */
      debug(method, details) {
        if (!this.debugMode) return;
        try {
          const payload = { method, details };
          eventBus.emit("debug:EventBinder", payload);
        } catch {
        }
      }
      /**
       * Attach binder lifetime to an AbortSignal.
       * All bindings will be unbound automatically when the signal aborts.
       * @param signal AbortSignal to link binder lifetime to
       */
      attachTo(signal) {
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
      bindDOM(target, event, handler, options = false) {
        if (!(target instanceof EventTarget)) {
          console.warn("EventBinder: Invalid DOM target", target);
          return;
        }
        if (this.domBindings.find((b) => b.target === target && b.event === event && b.handler === handler)) {
          this.debug("dom:bind:duplicate", { event, handler, target });
          return;
        }
        const controller = new AbortController();
        const normalizedOptions = typeof options === "boolean" ? { capture: options, signal: controller.signal } : { ...options, signal: controller.signal };
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
      unbindBus(event, handler) {
        const i = this.IBusBindings.findIndex((b) => b.event === event && b.handler === handler);
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
      unbindDOM(target, event, handler) {
        const i = this.domBindings.findIndex((b) => b.target === target && b.event === event && b.handler === handler);
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

// src/system/bin/PartialFetcher.ts
var PartialFetcher;
var init_PartialFetcher = __esm({
  "src/system/bin/PartialFetcher.ts"() {
    "use strict";
    init_EventBus();
    init_EventBinder();
    PartialFetcher = class {
      /**
       * Loads HTML from a URL and injects it into the target element.
       * Emits lifecycle events: partial:load:start, partial:load:success, partial:load:error, partial:load:complete
       */
      static async load(url, targetSelector, options = {}) {
        const { replace = true, signal, withBindings, debugBindings = false } = options;
        const runLoad = async () => {
          const basePayload = { url, targetSelector };
          eventBus.emit("partial:load:start", basePayload);
          try {
            const fetchOptions = signal ? { signal } : void 0;
            const response = await fetch(url, fetchOptions);
            if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
            const html = (await response.text()).trim();
            const container = document.querySelector(targetSelector);
            if (!container) throw new Error(`Target container not found: ${targetSelector}`);
            const template = document.createElement("template");
            template.innerHTML = html;
            if (replace) container.replaceChildren(...template.content.childNodes);
            else container.append(...template.content.childNodes);
            eventBus.emit("partial:load:success", { ...basePayload, html });
            return { container, html };
          } catch (error) {
            eventBus.emit("partial:load:error", { ...basePayload, error });
            throw error;
          } finally {
            eventBus.emit("partial:load:complete", basePayload);
          }
        };
        if (typeof withBindings === "function") {
          return EventBinder.withAutoUnbind(async (binder) => {
            if (signal) binder.attachTo(signal);
            withBindings(binder);
            return runLoad();
          }, debugBindings);
        } else {
          return runLoad();
        }
      }
    };
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
    VERSION = "nextworld-1.0.0";
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
      logDebug(msg, data) {
        if (this.options.debug) console.debug(`[PartialLoader] ${msg}`, data);
      }
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
          } catch {
            const url = item instanceof HTMLLinkElement ? item.getAttribute("src") || "" : item.url;
            results.push({ success: false, url, cached: false });
          }
        }
        eventBus.emit("partials:allLoaded", { count: results.length });
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
          if (this.loadingPromises.has(url)) await this.loadingPromises.get(url);
          if (this.options.cacheEnabled && this.cache.has(url)) {
            this.insertHTML(container, this.cache.get(url));
            this.loadedPartials.set(id || url, true);
            eventBus.emit("partial:loaded", { url, cached: true });
            return { success: true, url, cached: true };
          }
          const promise = this.fetchPartial(url);
          this.loadingPromises.set(url, promise);
          const html = await promise;
          if (this.options.cacheEnabled) this.cache.set(url, html);
          this.insertHTML(container, html);
          this.loadedPartials.set(id || url, true);
          eventBus.emit("partial:loaded", { url, cached: false });
          return { success: true, url, cached: false };
        } catch (error) {
          this.showError(container, error);
          eventBus.emit("partial:error", { url, error });
          throw error;
        } finally {
          this.loadingPromises.delete(url);
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
      }
      isPartialLoaded(id) {
        return this.loadedPartials.has(id);
      }
      resolveUrl(src) {
        if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(src) || src.startsWith("//")) return src;
        try {
          const base = this.options.baseUrl || window.location.origin + "/";
          const url = new URL(src, base).toString();
          return url.startsWith(window.location.origin) ? url.slice(window.location.origin.length) || "/" : url;
        } catch {
          return src;
        }
      }
      delay(ms) {
        return new Promise((r) => setTimeout(r, ms));
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
        return observer;
      }
    };
  }
});

// src/system/bin/ServiceWorkerManager.ts
var ServiceWorkerManager_exports = {};
__export(ServiceWorkerManager_exports, {
  ServiceWorkerManager: () => ServiceWorkerManager,
  VERSION: () => VERSION2
});
var VERSION2, ServiceWorkerManager;
var init_ServiceWorkerManager = __esm({
  "src/system/bin/ServiceWorkerManager.ts"() {
    "use strict";
    VERSION2 = "nextworld-1.0.0";
    ServiceWorkerManager = class {
      swPath;
      options;
      customConfig;
      registration = null;
      isSupported;
      constructor(swPath = "/sw.js", options = {}, customConfig = {}) {
        this.swPath = swPath;
        this.options = {
          scope: "/",
          updateViaCache: "none",
          ...options
        };
        this.customConfig = customConfig;
        this.isSupported = "serviceWorker" in navigator;
      }
      /**
       * Register the service worker
       */
      async register() {
        if (!this.isSupported) {
          throw new Error("ServiceWorker not supported");
        }
        try {
          this.registration = await navigator.serviceWorker.register(
            this.swPath,
            this.options
          );
          this.setupEventListeners();
          return this.registration;
        } catch (error) {
          console.error("SW registration failed:", error);
          throw error;
        }
      }
      /**
       * Apply custom configuration after registration
       */
      configure() {
        if (this.customConfig.strategy) {
          this.setStrategy(this.customConfig.strategy);
        }
      }
      /**
       * Unregister the service worker
       */
      async unregister() {
        if (!this.registration) return false;
        try {
          return await this.registration.unregister();
        } catch (error) {
          console.error("SW unregistration failed:", error);
          return false;
        }
      }
      /**
       * Update the service worker
       */
      async update() {
        if (!this.registration) return null;
        try {
          await this.registration.update();
          return null;
        } catch (error) {
          console.error("SW update failed:", error);
          return null;
        }
      }
      /**
       * Get registration status
       */
      getStatus() {
        if (!this.registration) return "unregistered";
        if (this.registration.installing) return "installing";
        if (this.registration.waiting) return "waiting";
        if (this.registration.active) return "active";
        return "unknown";
      }
      /**
       * Setup lifecycle event listeners
       */
      setupEventListeners() {
        if (!this.registration) return;
        this.registration.addEventListener("updatefound", () => {
          const newWorker = this.registration?.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              this.onUpdateAvailable?.(newWorker);
            }
          });
        });
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          this.onControllerChange?.();
        });
      }
      /**
       * Send a message to the service worker
       */
      async postMessage(message, transfer) {
        const sw = navigator.serviceWorker.controller;
        if (!sw) throw new Error("No active service worker");
        if (transfer) {
          sw.postMessage(message, { transfer });
        } else {
          sw.postMessage(message);
        }
      }
      /**
       * Wait for message from service worker
       */
      waitForMessage(timeout = 5e3) {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Message timeout")), timeout);
          const handler = (event) => {
            clearTimeout(timer);
            navigator.serviceWorker.removeEventListener("message", handler);
            resolve(event.data);
          };
          navigator.serviceWorker.addEventListener("message", handler);
        });
      }
      /**
       * Activate the waiting service worker
       */
      async activateWaiting() {
        if (!this.registration?.waiting) return false;
        try {
          await this.postMessage({ type: "SKIP_WAITING" });
          return true;
        } catch (error) {
          console.error("Failed to activate waiting SW:", error);
          return false;
        }
      }
      /**
       * Set runtime cache strategy (e.g., cache-first or network-first)
       */
      setStrategy(config = {}) {
        if (!navigator.serviceWorker.controller) {
          console.warn("No active SW to set strategy");
          return;
        }
        this.postMessage({
          type: "SET_STRATEGY",
          payload: config
        });
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
      cache = /* @__PURE__ */ new WeakMap();
      destroyed = false;
      constructor(container, options = {}) {
        if (!(container instanceof Element)) {
          throw new Error("AsyncImageLoader: container must be a DOM Element.");
        }
        this.container = container;
        this.includePicture = options.includePicture ?? false;
      }
      ensureActive() {
        if (this.destroyed || !this.container) {
          throw new Error("AsyncImageLoader: Instance destroyed.");
        }
      }
      getImages(selector = "img") {
        this.ensureActive();
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
      async waitForImagesToLoad(selector = "img", includeFailed = false) {
        const images = this.getImages(selector);
        const results = await Promise.all(
          images.map((img) => {
            if (this.cache.has(img)) return { element: img, loaded: true };
            if (img.complete && img.naturalWidth > 0) {
              this.cache.set(img, true);
              return { element: img, loaded: true };
            }
            return new Promise((resolve) => {
              img.addEventListener(
                "load",
                () => {
                  this.cache.set(img, true);
                  resolve({ element: img, loaded: true });
                },
                { once: true }
              );
              img.addEventListener(
                "error",
                () => resolve({ element: img, loaded: false }),
                { once: true }
              );
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
      add(callback) {
        if (!this.callbacks.has(callback)) this.callbacks.add(callback);
        this.start();
      }
      remove(callback) {
        this.callbacks.delete(callback);
        if (this.callbacks.size === 0) this.stop();
      }
      has(callback) {
        return this.callbacks.has(callback);
      }
      start() {
        if (this.running || this.callbacks.size === 0) return;
        this.running = true;
        this._loop();
      }
      stop() {
        this.running = false;
        if (this._rafId !== null) cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      pause() {
        this.stop();
      }
      resume() {
        if (this.callbacks.size > 0) this.start();
      }
      _loop = () => {
        if (!this.running) return;
        for (const cb of this.callbacks) {
          try {
            cb();
          } catch (err) {
            console.error("AnimationLoop callback error:", err);
          }
        }
        this._rafId = requestAnimationFrame(this._loop);
      };
    };
    animationLoop = new AnimationLoop();
  }
});

// src/system/features/SlidePlayer/SlidePlayer.ts
var SlidePlayer_exports = {};
__export(SlidePlayer_exports, {
  SlidePlayer: () => SlidePlayer,
  VERSION: () => VERSION3
});
var VERSION3, SlidePlayer;
var init_SlidePlayer = __esm({
  "src/system/features/SlidePlayer/SlidePlayer.ts"() {
    "use strict";
    init_EventBus();
    init_EventBinder();
    init_AsyncImageLoader();
    init_AnimationLoop();
    VERSION3 = "nextworld-1.2.0";
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
      pauseReasons = /* @__PURE__ */ new Set();
      loader;
      binder;
      animateCallback;
      lastPauseState = false;
      ready;
      constructor(containerOrSelector, {
        interval = _SlidePlayer.DEFAULT_INTERVAL,
        includePicture = false,
        dotsSelector = ".dots",
        autoCreateDots = false,
        startPaused = false,
        enableBusEvents = true,
        autoplay = true
      } = {}) {
        this.container = this.resolveContainer(containerOrSelector);
        this.interval = interval > 0 ? interval : _SlidePlayer.DEFAULT_INTERVAL;
        this.includePicture = includePicture;
        this.dotsSelector = dotsSelector;
        this.autoCreateDots = autoCreateDots;
        this.enableBusEvents = enableBusEvents;
        this.autoplay = autoplay;
        this.loader = new AsyncImageLoader(this.container, { includePicture });
        this.binder = new EventBinder(true);
        if (startPaused) this.pauseReasons.add("manual");
        this.animateCallback = () => this.animate();
        this.ready = this.init();
      }
      resolveContainer(containerOrSelector) {
        const container = typeof containerOrSelector === "string" ? document.querySelector(containerOrSelector) : containerOrSelector;
        if (!container) throw new Error("SlidePlayer: container element not found.");
        return container;
      }
      async init() {
        await this.loader.waitForImagesToLoad();
        this.refreshSlides();
        if (!this.slides.length) {
          console.warn("[SlidePlayer] No .slide elements found in container.");
          return;
        }
        this.setupDots();
        this.bindEvents();
        this.setActiveSlide(0);
        this.lastTickTime = performance.now();
        if (this.enableBusEvents) {
          this.binder.bindBus("user:inactive", () => this.togglePause("inactivity", true));
          this.binder.bindBus("user:active", () => this.togglePause("inactivity", false));
        }
        if (!this.isPaused()) animationLoop.add(this.animateCallback);
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
        if (shouldPause) this.pauseReasons.add(reason);
        else this.pauseReasons.delete(reason);
        this.emitPauseResumeIfChanged();
        if (this.isPaused()) {
          if (animationLoop.has(this.animateCallback)) animationLoop.remove(this.animateCallback);
        } else {
          if (!animationLoop.has(this.animateCallback)) animationLoop.add(this.animateCallback);
        }
      }
      emitPauseResumeIfChanged() {
        const nowPaused = this.isPaused();
        if (nowPaused !== this.lastPauseState) {
          this.lastPauseState = nowPaused;
          this.emit(nowPaused ? "slideplayer:paused" : "slideplayer:resumed", {
            reasons: Array.from(this.pauseReasons)
          });
        }
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
      play() {
        this.togglePause("manual", false);
      }
      pause() {
        this.togglePause("manual", true);
      }
      isPaused() {
        return this.pauseReasons.size > 0;
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
        this.binder.bindDOM(this.container, "pointerup", () => {
          if (this.isPointerDown) {
            this.handleSwipe();
            this.isPointerDown = false;
          }
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
        this.binder.bindBus("user:inactive", () => this.togglePause("inactivity", true));
        this.binder.bindBus("user:active", () => this.togglePause("inactivity", false));
      }
      bindUnloadEvent() {
        this.binder.bindDOM(window, "beforeunload", () => this.destroy());
      }
      handleSwipe() {
        const dx = this.pointerEndX - this.pointerStartX;
        const dy = this.pointerEndY - this.pointerStartY;
        if (Math.abs(dx) >= _SlidePlayer.SWIPE_THRESHOLD && Math.abs(dy) < _SlidePlayer.VERTICAL_TOLERANCE) {
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
        this.pauseReasons.clear();
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
    clamp = (value, min, max) => Math.max(min, Math.min(value, max));
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
        this.x = Math.random() * (dims.width - this.size.width);
        this.y = Math.random() * (dims.height - this.size.height);
        this.vx = (Math.random() - 0.5) * 3;
        this.vy = (Math.random() - 0.5) * 3;
        element.style.willChange = "transform";
        element.style.backfaceVisibility = "hidden";
        element.style.perspective = "1000px";
        element.style.opacity = "1";
        this.updatePosition();
      }
      updatePosition() {
        if (!this.element) return false;
        const x = this.options.useSubpixel ? this.x : Math.round(this.x);
        const y = this.options.useSubpixel ? this.y : Math.round(this.y);
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        return true;
      }
      update(multiplier, dims, applyPosition = true) {
        if (!this.element) return false;
        this.x += this.vx * multiplier;
        this.y += this.vy * multiplier;
        if (this.x <= 0 || this.x + this.size.width >= dims.width) {
          this.vx = -this.vx * DAMPING;
          this.vx = Math.abs(this.vx) < MIN_VELOCITY ? Math.sign(this.vx) * MIN_VELOCITY : this.vx;
          this.x = clamp(this.x, 0, dims.width - this.size.width);
        }
        if (this.y <= 0 || this.y + this.size.height >= dims.height) {
          this.vy = -this.vy * DAMPING;
          this.vy = Math.abs(this.vy) < MIN_VELOCITY ? Math.sign(this.vy) * MIN_VELOCITY : this.vy;
          this.y = clamp(this.y, 0, dims.height - this.size.height);
        }
        this.vx += (Math.random() - 0.5) * VELOCITY_JITTER;
        this.vy += (Math.random() - 0.5) * VELOCITY_JITTER;
        const speedSquared = this.vx ** 2 + this.vy ** 2;
        if (speedSquared > MAX_SPEED ** 2) {
          const scale = MAX_SPEED / Math.sqrt(speedSquared);
          this.vx *= scale;
          this.vy *= scale;
        }
        if (applyPosition) return this.updatePosition();
        return true;
      }
      resetPosition(dims) {
        this.x = Math.random() * (dims.width - this.size.width);
        this.y = Math.random() * (dims.height - this.size.height);
        this.updatePosition();
      }
      updateSize() {
        if (!this.element) return;
        this.size.width = this.element.offsetWidth;
        this.size.height = this.element.offsetHeight;
      }
      clampPosition(dims) {
        this.x = clamp(this.x, 0, dims.width - this.size.width);
        this.y = clamp(this.y, 0, dims.height - this.size.height);
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
      /**
       * Register a callback for window resize events.
       * Optionally debounce or throttle the callback.
       */
      onWindow(cb, options) {
        let wrappedCb;
        if (options?.debounceMs != null) {
          wrappedCb = debounce(cb, options.debounceMs);
        } else if (options?.throttleMs != null) {
          wrappedCb = throttle(cb, options.throttleMs);
        } else {
          wrappedCb = cb;
          wrappedCb.cancel = () => {
          };
        }
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
        let entry = this.elementObservers.get(el);
        if (!entry) {
          const callbacks = /* @__PURE__ */ new Set();
          const observer = new ResizeObserver(() => {
            callbacks.forEach((fn) => fn());
          });
          entry = { observer, callbacks };
          this.elementObservers.set(el, entry);
          observer.observe(el);
        }
        let wrappedCb;
        if (options?.debounceMs != null) {
          wrappedCb = debounce(cb, options.debounceMs);
        } else if (options?.throttleMs != null) {
          wrappedCb = throttle(cb, options.throttleMs);
        } else {
          wrappedCb = cb;
          wrappedCb.cancel = () => {
          };
        }
        entry.callbacks.add(wrappedCb);
        const callbacksRef = entry.callbacks;
        const observerRef = entry.observer;
        return () => {
          callbacksRef.delete(wrappedCb);
          wrappedCb.cancel?.();
          if (callbacksRef.size === 0) {
            observerRef.disconnect();
            this.elementObservers.delete(el);
          }
        };
      }
      /**
       * Get current size of an element.
       */
      getElement(el) {
        const rect = el.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }
      /**
       * Cleanup all registered window and element callbacks.
       */
      destroy() {
        for (const [cb, handler] of this.windowCallbacks.entries()) {
          window.removeEventListener("resize", handler);
        }
        this.windowCallbacks.clear();
        for (const entry of this.elementObservers.values()) {
          entry.observer.disconnect();
        }
        this.elementObservers.clear();
      }
    };
    resizeManager = new ResizeManager();
  }
});

// src/system/features/FloatingImages/FloatingImagesManager.ts
var FloatingImagesManager;
var init_FloatingImagesManager = __esm({
  "src/system/features/FloatingImages/FloatingImagesManager.ts"() {
    "use strict";
    init_FloatingImage();
    init_PerformanceMonitor();
    init_ResizeManager();
    init_AsyncImageLoader();
    init_AnimationLoop();
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
      constructor(container, options = {}) {
        this.container = container;
        this.debug = options.debug ?? false;
        this.performanceMonitor = new PerformanceMonitor();
        const perfSettings = this.performanceMonitor.getRecommendedSettings();
        this.maxImages = options.maxImages ?? perfSettings.maxImages;
        this.intersectionObserver = new IntersectionObserver((entries) => {
          this.isInViewport = entries[0].isIntersecting;
        }, { threshold: 0 });
        this.intersectionObserver.observe(this.container);
        this.setupResizeHandling();
        this.imageLoader = new AsyncImageLoader(this.container);
        this.updateContainerDimensions();
        this.animateCallback = () => this.animate();
        if (!animationLoop.has(this.animateCallback)) {
          animationLoop.add(this.animateCallback);
        }
        this.initializeImages();
      }
      setupResizeHandling() {
        this.unsubscribeWindow = resizeManager.onWindow(() => this.handleResize());
        this.unsubscribeElement = resizeManager.onElement(this.container, () => this.handleResize());
      }
      updateContainerDimensions() {
        const dims = resizeManager.getElement(this.container);
        this.containerWidth = dims.width;
        this.containerHeight = dims.height;
      }
      async initializeImages() {
        try {
          const imgElements = await this.imageLoader.waitForImagesToLoad(".floating-image");
          const dims = { width: this.containerWidth, height: this.containerHeight };
          imgElements.slice(0, this.maxImages).forEach((el) => this.addExistingImage(el, dims));
        } catch {
        }
      }
      addExistingImage(el, dims) {
        if (this.images.length >= this.maxImages) return;
        const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
        this.images.push(floatingImage);
      }
      handleResize() {
        if (this._destroyed) return;
        this.updateContainerDimensions();
        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images.forEach((img) => {
          img.updateSize();
          img.clampPosition(dims);
          img.updatePosition();
        });
      }
      animate() {
        if (this._destroyed) return;
        const skipFrame = this.performanceMonitor.update();
        if (skipFrame || !this.isInViewport || this.speedMultiplier === 0) return;
        const multiplier = this.speedMultiplier;
        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images = this.images.filter((img) => img.update(multiplier, dims));
      }
      resetAllImagePositions() {
        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images.forEach((img) => img.resetPosition(dims));
      }
      reinitializeImages() {
        if (this._destroyed) return;
        this.images.forEach((img) => img.destroy());
        this.images.length = 0;
        const dims = { width: this.containerWidth, height: this.containerHeight };
        const imgElements = Array.from(this.container.querySelectorAll(".floating-image")).slice(0, this.maxImages);
        imgElements.forEach((el) => {
          const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
          this.images.push(floatingImage);
        });
      }
      destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        if (animationLoop.has(this.animateCallback)) {
          animationLoop.remove(this.animateCallback);
        }
        this.unsubscribeWindow?.();
        this.unsubscribeElement?.();
        this.intersectionObserver.disconnect();
        this.images.forEach((img) => img.destroy());
        this.images.length = 0;
        this.imageLoader.destroy();
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
    VERSION4 = "nextworld-1.0.0";
    ScreensaverController = class {
      partialUrl;
      targetSelector;
      inactivityDelay;
      screensaverManager = null;
      watcher = null;
      _destroyed = false;
      eventBinder;
      _partialLoaded = false;
      partialFetcher;
      _onInactivity;
      _onActivity;
      constructor(options) {
        this.partialUrl = options.partialUrl;
        this.targetSelector = options.targetSelector;
        this.inactivityDelay = options.inactivityDelay ?? 12e3;
        this.watcher = options.watcher ?? null;
        this.partialFetcher = options.partialFetcher ?? PartialFetcher;
        this.eventBinder = new EventBinder(true);
        this._onInactivity = this.showScreensaver.bind(this);
        this._onActivity = this.hideScreensaver.bind(this);
        eventBus.emit("screensaver:log", {
          level: "info",
          message: "ScreensaverController initialized",
          details: {
            partialUrl: this.partialUrl,
            targetSelector: this.targetSelector,
            inactivityDelay: this.inactivityDelay
          }
        });
      }
      async init() {
        if (this._destroyed) return;
        try {
          if (!this.watcher) {
            this.watcher = InactivityWatcher.getInstance({
              inactivityDelay: this.inactivityDelay
            });
          }
          this.eventBinder.bindBus("user:inactive", this._onInactivity);
          this.eventBinder.bindBus("user:active", this._onActivity);
          eventBus.emit("screensaver:log", {
            level: "info",
            message: "Bound user inactivity/active events"
          });
        } catch (error) {
          eventBus.emit("screensaver:error", {
            message: "Failed to initialize inactivity watcher",
            error
          });
        }
      }
      async showScreensaver() {
        if (this._destroyed) return;
        try {
          if (!this._partialLoaded) {
            await this.partialFetcher.load(this.partialUrl, this.targetSelector);
            this._partialLoaded = true;
          }
          const container = document.querySelector(this.targetSelector);
          if (!container) {
            eventBus.emit("screensaver:error", {
              message: `Target selector "${this.targetSelector}" not found`
            });
            return;
          }
          container.style.opacity = "0";
          container.style.display = "";
          void container.offsetWidth;
          container.style.transition = "opacity 0.5s ease";
          container.style.opacity = "1";
          if (!this.screensaverManager) {
            this.screensaverManager = new FloatingImagesManager(container, { debug: true });
          } else {
            this.screensaverManager.destroy();
            this.screensaverManager = new FloatingImagesManager(container, { debug: true });
          }
          eventBus.emit("screensaver:log", {
            level: "info",
            message: "Screensaver displayed"
          });
        } catch (error) {
          eventBus.emit("screensaver:error", {
            message: "Failed to load or show screensaver",
            error
          });
        }
      }
      hideScreensaver() {
        if (this._destroyed) return;
        try {
          const container = document.querySelector(this.targetSelector);
          if (container) {
            container.style.transition = "opacity 0.5s ease";
            container.style.opacity = "0";
            setTimeout(() => {
              container.style.display = "none";
            }, 500);
          }
        } catch (error) {
          eventBus.emit("screensaver:error", {
            message: "Failed to hide screensaver",
            error
          });
        }
      }
      destroy() {
        if (this._destroyed) return;
        this._destroyed = true;
        this.hideScreensaver();
        this.screensaverManager?.destroy();
        this.eventBinder.unbindAll();
        this._partialLoaded = false;
        eventBus.emit("screensaver:log", {
          level: "info",
          message: "ScreensaverController destroyed"
        });
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
   * Equivalent to listening for `DOMContentLoaded`, but safe to call multiple times.
   *
   * @returns Promise that resolves once the DOM is ready.
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
   * Uses a `MutationObserver` to detect added nodes, with optional timeout and abort support.
   *
   * @typeParam T - Type of element(s) expected (extends Element).
   *
   * @param selectors - CSS selector string or array of selectors to wait for.
   * @param options - Options to control timeout, root element, and abort signal.
   * @returns Promise that resolves with the found element (if one selector) or array of elements (if multiple).
   * @throws DOMException `"TimeoutError"` if elements are not found within the timeout.
   * @throws DOMException `"AbortError"` if the operation is aborted via `AbortSignal`.
   */
  static waitForElement(selectors, options = {}) {
    const { timeout = 5e3, root = document, signal } = options;
    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
    const isMultiple = selectorList.length > 1;
    return new Promise((resolve, reject) => {
      let timeoutId;
      const foundElements = /* @__PURE__ */ new Map();
      const cleanup = () => {
        observer.disconnect();
        if (timeoutId !== void 0) clearTimeout(timeoutId);
        if (signal) signal.removeEventListener("abort", onAbort);
      };
      const resolveFound = () => {
        const result = selectorList.map((s) => foundElements.get(s));
        cleanup();
        resolve(isMultiple ? result : result[0]);
      };
      const check = () => {
        for (const selector of selectorList) {
          if (!foundElements.has(selector)) {
            const el = root.querySelector(selector);
            if (el) foundElements.set(selector, el);
          }
        }
        if (foundElements.size === selectorList.length) {
          resolveFound();
          return true;
        }
        return false;
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException("waitForElement aborted", "AbortError"));
      };
      if (signal) {
        if (signal.aborted) return onAbort();
        signal.addEventListener("abort", onAbort, { once: true });
      }
      if (check()) return;
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            if (check()) return;
          }
        }
      });
      observer.observe(root, { childList: true, subtree: true });
      if (isFinite(timeout) && timeout > 0) {
        timeoutId = window.setTimeout(() => {
          cleanup();
          const missing = selectorList.filter((s) => !foundElements.has(s));
          reject(new DOMException(
            `Element(s) "${missing.join(", ")}" not found in ${timeout}ms`,
            "TimeoutError"
          ));
        }, timeout);
      }
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
function generateId(prefix = "id", length = 9) {
  return `${prefix}-${Math.random().toString(36).slice(2, 2 + length)}`;
}

// src/app/symlink.ts
init_ServiceWorkerManager();

// src/app/main.ts
var AppConfig = class {
  config;
  constructor(options = {}) {
    this.config = {
      hostname: window.location.hostname,
      production: window.location.hostname !== "localhost" && !window.location.hostname.includes("127.0.0.1"),
      features: options.features ?? {},
      ...options
    };
  }
  get(key) {
    return key.split(".").reduce((value, k) => {
      if (value?.[k] === void 0) {
        console.log(`[spaceface] Config key "${key}" is undefined`);
        return void 0;
      }
      return value[k];
    }, this.config);
  }
};
var Spaceface = class _Spaceface {
  static EVENT_LOG = "log";
  static EVENT_TELEMETRY = "telemetry";
  appConfig;
  config;
  features;
  debug;
  pageType;
  startTime;
  featureModules;
  featureCache;
  inactivityWatcher;
  screensaverController;
  slideshows = [];
  swManager;
  _partialUnsub;
  _partialObserver;
  constructor(options = {}) {
    this.appConfig = new AppConfig(options);
    this.config = this.appConfig.config;
    this.features = this.config.features ?? {};
    this.debug = !!this.config.debug;
    this.pageType = this.resolvePageType();
    this.startTime = performance.now();
    this.featureModules = this.defineFeatureModules();
    this.featureCache = /* @__PURE__ */ new Map();
    this.inactivityWatcher = null;
    this.screensaverController = null;
    this.validateConfig();
    Object.keys(this.featureModules).forEach(
      (name) => this.loadFeatureModule(name)
    );
  }
  validateConfig() {
    if (!this.config || typeof this.config !== "object") {
      throw new Error("Invalid or missing configuration object");
    }
    if (!this.config.features) this.log("warn", "No features specified in config");
  }
  log(level, ...args) {
    if (!this.debug && level === "debug") return;
    eventBus.emit(_Spaceface.EVENT_LOG, { level, args });
    if (this.debug) {
      const consoleMethodMap = {
        debug: "debug",
        info: "info",
        warn: "warn",
        error: "error"
      };
      const method = consoleMethodMap[level] ?? "log";
      console[method](`[spaceface] [${level.toUpperCase()}]`, ...args);
    }
  }
  defineFeatureModules() {
    return {
      partialLoader: () => Promise.resolve().then(() => (init_PartialLoader(), PartialLoader_exports)),
      slideplayer: () => Promise.resolve().then(() => (init_SlidePlayer(), SlidePlayer_exports)),
      screensaver: () => Promise.resolve().then(() => (init_ScreensaverController(), ScreensaverController_exports)),
      serviceWorker: () => Promise.resolve().then(() => (init_ServiceWorkerManager(), ServiceWorkerManager_exports))
    };
  }
  resolvePageType() {
    const path = window.location.pathname;
    const body = document.body;
    if (body.dataset.page) return body.dataset.page;
    if (path === "/") return "home";
    if (path === "/app") return "app";
    return "default";
  }
  async loadFeatureModule(name) {
    if (!this.featureModules[name] || this.featureCache.has(name)) {
      return this.featureCache.get(name) ?? null;
    }
    try {
      const module = await this.featureModules[name]();
      this.featureCache.set(name, module);
    } catch (err) {
      this.log("error", `Failed to load module "${name}"`, err);
      this.featureCache.set(name, null);
    }
    return this.featureCache.get(name);
  }
  // ========================================================================
  // Feature initializers
  // ========================================================================
  async initInactivityWatcher() {
    try {
      const { screensaver } = this.features;
      if (!screensaver || this.inactivityWatcher) return;
      this.inactivityWatcher = InactivityWatcher.getInstance({
        inactivityDelay: screensaver.delay ?? 3e3
      });
    } catch (err) {
      this.log("error", "Failed to initialize InactivityWatcher", err);
    }
  }
  async initSlidePlayer() {
    try {
      const { slideplayer } = this.features;
      if (!slideplayer) return;
      const module = await this.loadFeatureModule("slideplayer");
      const SlidePlayer2 = module?.SlidePlayer;
      if (!SlidePlayer2) return;
      this.slideshows = [];
      for (const node of document.querySelectorAll(".slideshow-container")) {
        const slideshow = new SlidePlayer2(node, {
          interval: slideplayer.interval ?? 5e3,
          includePicture: slideplayer.includePicture ?? false
        });
        if (slideshow.ready?.then) await slideshow.ready;
        this.slideshows.push(slideshow);
      }
      this.log("info", `${this.slideshows.length} SlidePlayer instance(s) loaded`);
    } catch (err) {
      this.log("error", "Failed to initialize SlidePlayer", err);
    }
  }
  async initScreensaver() {
    try {
      const { screensaver } = this.features;
      if (!screensaver?.partialUrl) {
        this.log("error", "Screensaver configuration is missing or incomplete");
        return;
      }
      const module = await this.loadFeatureModule("screensaver");
      const ScreensaverController2 = module?.ScreensaverController;
      if (!ScreensaverController2) return;
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
      if (this.screensaverController?.init) {
        await this.screensaverController.init();
      }
      eventBus.emit("screensaver:initialized", id);
      this.log("info", "Screensaver initialized:", id);
    } catch (err) {
      this.log("error", "Failed to initialize screensaver", err);
    }
  }
  async initServiceWorker() {
    try {
      if (!this.features.serviceWorker) return;
      const module = await this.loadFeatureModule("serviceWorker");
      const Manager = module?.default;
      if (!Manager) return;
      const swManager = new Manager("/sw.js", {}, {
        strategy: { images: "cache-first", others: "network-first" }
      });
      await swManager.register();
      swManager.configure();
      this.swManager = swManager;
      this.log("info", "Service Worker registered and configured");
    } catch (err) {
      this.log("error", "Service Worker registration failed", err);
    }
  }
  async initPartialLoader() {
    try {
      const config = this.features.partialLoader;
      if (!config?.enabled) return null;
      const module = await this.loadFeatureModule("partialLoader");
      const PartialLoader2 = module?.PartialLoader;
      if (!PartialLoader2) return null;
      const loader = new PartialLoader2({
        debug: config.debug ?? this.debug,
        baseUrl: config.baseUrl ?? "/",
        cacheEnabled: config.cacheEnabled ?? true
      });
      await loader.loadContainer(document);
      this._partialObserver = loader.watch(document);
      this.log("info", "PartialLoader initialized");
      return loader;
    } catch (err) {
      this.log("error", "PartialLoader initialization failed", err);
      return null;
    }
  }
  async initPageFeatures() {
    try {
      this.log("info", `Initializing features for page type: ${this.pageType}`);
      this.log("info", `Page features initialized for: ${this.pageType}`);
    } catch (err) {
      this.log("error", `Page feature initialization failed for ${this.pageType}`, err);
    }
  }
  // Main init
  async init() {
    try {
      this.log("info", `App initialization started (Page: ${this.pageType})`);
      document.documentElement.classList.add("js-enabled", `page-${this.pageType}`);
      await DomReadyPromise.ready();
      this.log("info", "DOM ready");
      const featurePromises = [
        this.initInactivityWatcher(),
        this.initPartialLoader(),
        this.initSlidePlayer(),
        this.initScreensaver(),
        this.initServiceWorker()
      ];
      await Promise.allSettled(featurePromises);
      await this.initPageFeatures();
      const duration = (performance.now() - this.startTime).toFixed(2);
      this.log("info", `App initialized in ${duration}ms`);
      eventBus.emit(_Spaceface.EVENT_TELEMETRY, {
        type: "init:duration",
        value: duration,
        page: this.pageType
      });
    } catch (err) {
      this.log("error", "Critical app initialization error", err);
    }
  }
  destroy() {
    if (this._partialUnsub) {
      this._partialUnsub();
      this._partialUnsub = void 0;
    }
  }
};
var isDev = ["localhost", "127.0.0.1"].some(
  (host) => window.location.hostname.includes(host)
);
if (isDev) {
  eventBus.onAny((eventName, payload) => {
    if (!payload) return console.log(`[spaceface onAny] Event: ${eventName} \u2013 no payload!`);
    if (typeof payload === "string") return console.log(`[spaceface onAny] Event: ${eventName} [LOG]`, payload);
    const { level = "log", message, args, ...otherDetails } = payload;
    const fullMessage = message ?? args ?? otherDetails ?? "(no details)";
    const consoleMethodMap = {
      debug: "debug",
      info: "info",
      warn: "warn",
      error: "error",
      log: "log"
    };
    const method = consoleMethodMap[level] ?? "log";
    console[method](`[ spaceface onAny ] Event: ${eventName} [${level.toUpperCase()}] \u2013`, fullMessage);
  });
}
var app = new Spaceface({
  features: {
    partialLoader: { enabled: true, debug: false, baseUrl: "/", cacheEnabled: true },
    slideplayer: { interval: 5e3, includePicture: false, showDots: false },
    screensaver: { delay: 4500, partialUrl: "content/feature/screensaver/index.html" },
    serviceWorker: true
  }
});
app.init();
export {
  AppConfig,
  Spaceface
};
//# sourceMappingURL=bundle.js.map
