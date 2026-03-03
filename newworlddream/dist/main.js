// newworlddream/src/core/config.ts
var defaultConfig = {
  mode: "dev",
  logLevel: "debug",
  screensaverIdleMs: 12e3,
  routeSelector: "html[data-page]"
};
function resolveConfig(input = {}) {
  const mode = input.mode === "prod" ? "prod" : "dev";
  const logLevel = toLogLevel(input.logLevel, mode);
  const screensaverIdleMs = typeof input.screensaverIdleMs === "number" && input.screensaverIdleMs > 0 ? input.screensaverIdleMs : defaultConfig.screensaverIdleMs;
  const routeSelector = typeof input.routeSelector === "string" && input.routeSelector.trim().length > 0 ? input.routeSelector : defaultConfig.routeSelector;
  return {
    mode,
    logLevel,
    screensaverIdleMs,
    routeSelector
  };
}
function toLogLevel(value, mode) {
  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }
  return mode === "prod" ? "warn" : "debug";
}

// newworlddream/src/core/events.ts
var EventBus = class {
  listeners = /* @__PURE__ */ new Map();
  on(event, fn, priority = 0) {
    const list = this.listeners.get(event) ?? [];
    const listener = { fn, priority };
    let i = list.length;
    while (i > 0 && list[i - 1].priority < priority) i -= 1;
    list.splice(i, 0, listener);
    this.listeners.set(event, list);
    return () => this.off(event, fn);
  }
  once(event, fn, priority = 0) {
    const wrapper = (payload) => {
      this.off(event, wrapper);
      return fn(payload);
    };
    return this.on(event, wrapper, priority);
  }
  off(event, fn) {
    const list = this.listeners.get(event);
    if (!list) return;
    this.listeners.set(
      event,
      list.filter((listener) => listener.fn !== fn)
    );
  }
  emit(event, payload) {
    const list = [...this.listeners.get(event) ?? []];
    for (const listener of list) {
      try {
        void listener.fn(payload);
      } catch (error) {
        console.error(`[EventBus] listener failed for ${event}`, error);
      }
    }
  }
  async emitAsync(event, payload) {
    const list = [...this.listeners.get(event) ?? []];
    for (const listener of list) {
      try {
        await listener.fn(payload);
      } catch (error) {
        console.error(`[EventBus] listener failed for ${event}`, error);
      }
    }
  }
};
var eventBus = new EventBus();

// newworlddream/src/core/registry.ts
var FeatureRegistry = class {
  features = [];
  register(feature, conditions = {}) {
    this.features.push({ feature, conditions });
  }
  resolve(ctx) {
    return this.features.filter(({ conditions }) => this.matches(conditions, ctx)).map(({ feature }) => feature);
  }
  matches(conditions, ctx) {
    if (conditions.mode && conditions.mode !== "any" && conditions.mode !== ctx.config.mode) {
      return false;
    }
    if (conditions.routeIncludes && !ctx.route.includes(conditions.routeIncludes)) {
      return false;
    }
    if (conditions.requiredSelector) {
      return Boolean(document.querySelector(conditions.requiredSelector));
    }
    return true;
  }
};

// newworlddream/src/core/logger.ts
var LEVEL_ORDER = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};
function createLogger(scope, level) {
  const canLog = (candidate) => LEVEL_ORDER[candidate] >= LEVEL_ORDER[level];
  const write = (candidate, message, data) => {
    if (!canLog(candidate)) return;
    const prefix = `[${scope}] [${candidate.toUpperCase()}]`;
    if (candidate === "error") {
      console.error(prefix, message, data);
      return;
    }
    if (candidate === "warn") {
      console.warn(prefix, message, data);
      return;
    }
    console.log(prefix, message, data);
  };
  return {
    debug: (message, data) => write("debug", message, data),
    info: (message, data) => write("info", message, data),
    warn: (message, data) => write("warn", message, data),
    error: (message, data) => write("error", message, data)
  };
}

// newworlddream/src/core/startup.ts
var StartupPipeline = class {
  config;
  logger;
  featureInstances = [];
  ctx;
  constructor(config) {
    this.config = config;
    this.logger = createLogger("startup", config.logLevel);
    this.ctx = {
      config,
      events: eventBus,
      logger: createLogger("app", config.logLevel),
      route: currentRoute()
    };
  }
  async init(features) {
    this.ctx.route = currentRoute();
    eventBus.emit("startup:begin", { mode: this.config.mode });
    const initialized = [];
    const failed = [];
    for (const feature of features) {
      const start = performance.now();
      try {
        await feature.init(this.ctx);
        this.featureInstances.push(feature);
        initialized.push(feature.name);
        eventBus.emit("startup:feature:init", {
          feature: feature.name,
          durationMs: Math.round(performance.now() - start),
          ok: true
        });
      } catch (error) {
        failed.push({ feature: feature.name, error });
        eventBus.emit("startup:feature:init", {
          feature: feature.name,
          durationMs: Math.round(performance.now() - start),
          ok: false,
          error
        });
        this.logger.error(`Feature init failed: ${feature.name}`, error);
      }
    }
    eventBus.emit("startup:ready", {
      initialized,
      failed: failed.map((item) => item.feature)
    });
    return { initialized, failed };
  }
  async onRouteChange(path) {
    this.ctx.route = path;
    eventBus.emit("route:changed", { path });
    for (const feature of this.featureInstances) {
      if (!feature.onRouteChange) continue;
      try {
        await feature.onRouteChange(path, this.ctx);
      } catch (error) {
        this.logger.warn(`Feature route handler failed: ${feature.name}`, error);
      }
    }
  }
  async destroy(reason = "manual") {
    eventBus.emit("startup:destroy", { reason });
    for (let i = this.featureInstances.length - 1; i >= 0; i -= 1) {
      const feature = this.featureInstances[i];
      try {
        await feature.destroy?.();
      } catch (error) {
        this.logger.warn(`Feature destroy failed: ${feature.name}`, error);
      }
    }
    this.featureInstances.length = 0;
  }
};
function currentRoute() {
  return window.location.pathname;
}

// newworlddream/src/features/slideshow/SlideshowFeature.ts
var SlideshowFeature = class {
  name = "slideshow";
  root = null;
  slides = [];
  index = 0;
  unsubscribeNext;
  unsubscribePrev;
  init(ctx) {
    this.root = document.querySelector("[data-slideshow]");
    if (!this.root) {
      ctx.logger.debug("slideshow skipped: missing [data-slideshow]");
      return;
    }
    this.slides = Array.from(this.root.querySelectorAll("[data-slide]"));
    this.index = 0;
    this.render();
    this.unsubscribeNext = ctx.events.on("slideshow:next", () => this.next());
    this.unsubscribePrev = ctx.events.on("slideshow:prev", () => this.prev());
    ctx.logger.info("slideshow initialized", { slides: this.slides.length });
  }
  destroy() {
    this.unsubscribeNext?.();
    this.unsubscribePrev?.();
    this.unsubscribeNext = void 0;
    this.unsubscribePrev = void 0;
    this.root = null;
    this.slides = [];
  }
  next() {
    if (this.slides.length === 0) return;
    this.index = (this.index + 1) % this.slides.length;
    this.render();
  }
  prev() {
    if (this.slides.length === 0) return;
    this.index = (this.index - 1 + this.slides.length) % this.slides.length;
    this.render();
  }
  render() {
    for (let i = 0; i < this.slides.length; i += 1) {
      const visible = i === this.index;
      this.slides[i].hidden = !visible;
      this.slides[i].setAttribute("aria-hidden", String(!visible));
    }
  }
};

// newworlddream/src/features/screensaver/ScreensaverFeature.ts
var ScreensaverFeature = class {
  name = "screensaver";
  options;
  timer = null;
  target = null;
  onActivityBound;
  events;
  constructor(options) {
    this.options = options;
    this.onActivityBound = this.onActivity.bind(this);
  }
  init(ctx) {
    this.events = ctx.events;
    this.target = document.querySelector(this.options.targetSelector);
    if (!this.target) {
      ctx.logger.debug("screensaver skipped: target not found", { selector: this.options.targetSelector });
      return;
    }
    document.addEventListener("mousemove", this.onActivityBound, { passive: true });
    document.addEventListener("keydown", this.onActivityBound, { passive: true });
    document.addEventListener("pointerdown", this.onActivityBound, { passive: true });
    this.armTimer(ctx);
  }
  destroy() {
    document.removeEventListener("mousemove", this.onActivityBound);
    document.removeEventListener("keydown", this.onActivityBound);
    document.removeEventListener("pointerdown", this.onActivityBound);
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.target) {
      this.target.hidden = true;
      this.target = null;
    }
    this.events = void 0;
  }
  onActivity() {
    if (!this.target) return;
    const wasVisible = !this.target.hidden;
    this.target.hidden = true;
    if (wasVisible) {
      this.events?.emit("screensaver:hidden", { target: this.options.targetSelector });
    }
    this.events?.emit("user:active", { at: Date.now() });
    this.armTimer();
  }
  armTimer(ctx) {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }
    const events = ctx?.events ?? this.events;
    this.timer = window.setTimeout(() => {
      if (!this.target) return;
      this.target.hidden = false;
      events?.emit("user:inactive", { at: Date.now(), idleMs: this.options.idleMs });
      events?.emit("screensaver:shown", { target: this.options.targetSelector });
    }, this.options.idleMs);
  }
};

// newworlddream/src/app/main.ts
async function main() {
  const config = resolveConfig({
    mode: readModeFromDom(),
    screensaverIdleMs: 6e3
  });
  const startup = new StartupPipeline(config);
  const registry = new FeatureRegistry();
  registry.register(new SlideshowFeature(), {
    requiredSelector: "[data-slideshow]",
    mode: "any"
  });
  registry.register(
    new ScreensaverFeature({
      targetSelector: "#screensaver",
      idleMs: config.screensaverIdleMs
    }),
    {
      requiredSelector: "#screensaver",
      mode: "any"
    }
  );
  const ctxForResolve = {
    config,
    events: eventBus,
    logger: createLogger("registry", config.logLevel),
    route: window.location.pathname
  };
  const activeFeatures = registry.resolve(ctxForResolve);
  await startup.init(activeFeatures);
  bindGlobalSlideControls();
  bindRouteHooks(startup);
}
function readModeFromDom() {
  const value = document.documentElement.getAttribute("data-mode");
  return value === "prod" ? "prod" : "dev";
}
function bindGlobalSlideControls() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      eventBus.emit("slideshow:next", { source: "keyboard" });
    }
    if (event.key === "ArrowLeft") {
      eventBus.emit("slideshow:prev", { source: "keyboard" });
    }
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target) return;
    const next = target.closest("[data-slide-next]");
    if (next) {
      eventBus.emit("slideshow:next", { source: "click" });
      return;
    }
    const prev = target.closest("[data-slide-prev]");
    if (prev) {
      eventBus.emit("slideshow:prev", { source: "click" });
    }
  });
}
function bindRouteHooks(startup) {
  window.addEventListener("popstate", () => {
    void startup.onRouteChange(window.location.pathname);
  });
  window.addEventListener("beforeunload", () => {
    void startup.destroy("beforeunload");
  });
}
void main();
//# sourceMappingURL=main.js.map
