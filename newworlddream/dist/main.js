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
    eventBus.emit("log:entry", {
      scope,
      level: candidate,
      message,
      data,
      time: Date.now()
    });
  };
  return {
    debug: (message, data) => write("debug", message, data),
    info: (message, data) => write("info", message, data),
    warn: (message, data) => write("warn", message, data),
    error: (message, data) => write("error", message, data)
  };
}
function attachConsoleLogSink(minLevel = "debug") {
  const canLog = (candidate) => LEVEL_ORDER[candidate] >= LEVEL_ORDER[minLevel];
  return eventBus.on("log:entry", (entry) => {
    if (!canLog(entry.level)) return;
    const prefix = `[${entry.scope}] [${entry.level.toUpperCase()}]`;
    if (entry.level === "error") {
      console.error(prefix, entry.message, entry.data);
      return;
    }
    if (entry.level === "warn") {
      console.warn(prefix, entry.message, entry.data);
      return;
    }
    console.log(prefix, entry.message, entry.data);
  });
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
    this.featureInstances.length = 0;
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
  async reconcileFeatures(features, path) {
    this.ctx.route = path;
    eventBus.emit("route:changed", { path });
    const nextByName = new Map(features.map((feature) => [feature.name, feature]));
    const currentByName = new Map(this.featureInstances.map((feature) => [feature.name, feature]));
    const nextActive = [];
    for (const [name, feature] of currentByName.entries()) {
      const nextFeature = nextByName.get(name);
      if (nextFeature && nextFeature === feature) continue;
      try {
        await feature.destroy?.();
      } catch (error) {
        this.logger.warn(`Feature destroy during route reconcile failed: ${name}`, error);
      }
    }
    for (const [name, feature] of currentByName.entries()) {
      const nextFeature = nextByName.get(name);
      if (!nextFeature || nextFeature !== feature) continue;
      nextActive.push(feature);
      if (!feature.onRouteChange) continue;
      try {
        await feature.onRouteChange(path, this.ctx);
      } catch (error) {
        this.logger.warn(`Feature route handler failed: ${name}`, error);
      }
    }
    for (const [name, feature] of nextByName.entries()) {
      const currentFeature = currentByName.get(name);
      if (currentFeature && currentFeature === feature) continue;
      const start = performance.now();
      try {
        await feature.init(this.ctx);
        nextActive.push(feature);
        eventBus.emit("startup:feature:init", {
          feature: feature.name,
          durationMs: Math.round(performance.now() - start),
          ok: true
        });
      } catch (error) {
        eventBus.emit("startup:feature:init", {
          feature: feature.name,
          durationMs: Math.round(performance.now() - start),
          ok: false,
          error
        });
        this.logger.error(`Feature init during route reconcile failed: ${name}`, error);
      }
    }
    this.featureInstances.length = 0;
    for (const feature of nextActive) {
      this.featureInstances.push(feature);
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

// newworlddream/src/core/router.ts
var RouteCoordinator = class {
  containerSelector;
  logger;
  hooks;
  currentAbort;
  navToken = 0;
  started = false;
  constructor(options) {
    this.containerSelector = options.containerSelector;
    this.logger = options.logger;
    this.hooks = options.hooks ?? {};
  }
  start() {
    if (this.started) return;
    this.started = true;
    document.addEventListener("click", this.onDocumentClick);
    window.addEventListener("popstate", this.onPopState);
  }
  destroy() {
    if (!this.started) return;
    this.started = false;
    document.removeEventListener("click", this.onDocumentClick);
    window.removeEventListener("popstate", this.onPopState);
    this.currentAbort?.abort();
    this.currentAbort = void 0;
  }
  async navigate(input, options = {}) {
    const url = new URL(input.toString(), window.location.href);
    const current = new URL(window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.href = url.toString();
      return;
    }
    if (url.pathname === current.pathname && url.search === current.search && url.hash === current.hash && !options.fromPopState) {
      return;
    }
    const token = ++this.navToken;
    this.currentAbort?.abort();
    const controller = new AbortController();
    this.currentAbort = controller;
    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: "text/html" }
      });
      if (!response.ok) {
        throw new Error(`Route fetch failed: HTTP ${response.status}`);
      }
      const html = await response.text();
      if (token !== this.navToken) return;
      const parser = new DOMParser();
      const nextDocument = parser.parseFromString(html, "text/html");
      const container = document.querySelector(this.containerSelector);
      const nextContainer = nextDocument.querySelector(this.containerSelector);
      if (!container || !nextContainer) {
        window.location.href = url.toString();
        return;
      }
      const swapContext = { url, nextDocument, container, nextContainer };
      await this.hooks.onBeforeSwap?.(swapContext);
      if (token !== this.navToken) return;
      container.innerHTML = nextContainer.innerHTML;
      if (nextDocument.title) {
        document.title = nextDocument.title;
      }
      if (!options.fromPopState) {
        if (options.replace) {
          window.history.replaceState(null, "", url.toString());
        } else {
          window.history.pushState(null, "", url.toString());
        }
      }
      await this.hooks.onAfterSwap?.(swapContext);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      this.logger.error("route navigation failed", { error, url: url.toString() });
      this.hooks.onError?.(error, url);
      window.location.href = url.toString();
    } finally {
      if (this.currentAbort === controller) {
        this.currentAbort = void 0;
      }
    }
  }
  onDocumentClick = (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    const anchor = target?.closest("a[href]");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.dataset.router === "off") return;
    if (anchor.hasAttribute("download")) return;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    void this.navigate(url.toString());
  };
  onPopState = () => {
    void this.navigate(window.location.href, { fromPopState: true, replace: true });
  };
};

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

// newworlddream/src/features/floating-images/FloatingImagesFeature.ts
var FloatingImagesFeature = class {
  name = "floating-images";
  options;
  container = null;
  items = [];
  frame = null;
  running = false;
  lastTs = 0;
  pausedByVisibility = false;
  pausedByScreensaver = false;
  unsubScreensaverShown;
  unsubScreensaverHidden;
  constructor(options = {}) {
    this.options = {
      containerSelector: options.containerSelector ?? "[data-floating-images]",
      itemSelector: options.itemSelector ?? "[data-floating-item]",
      baseSpeed: options.baseSpeed ?? 46,
      pauseOnScreensaver: options.pauseOnScreensaver ?? true
    };
  }
  init(ctx) {
    this.container = document.querySelector(this.options.containerSelector);
    if (!this.container) {
      ctx.logger.debug("floating-images skipped: container missing", {
        selector: this.options.containerSelector
      });
      return;
    }
    this.items = this.collectItems(this.container);
    if (this.items.length === 0) {
      ctx.logger.debug("floating-images skipped: no items", {
        selector: this.options.itemSelector
      });
      return;
    }
    this.running = true;
    this.lastTs = performance.now();
    this.pausedByVisibility = document.visibilityState === "hidden";
    this.pausedByScreensaver = false;
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("resize", this.onResize, { passive: true });
    if (this.options.pauseOnScreensaver) {
      this.unsubScreensaverShown = ctx.events.on("screensaver:shown", () => {
        this.pausedByScreensaver = true;
        this.updateAnimationState();
      });
      this.unsubScreensaverHidden = ctx.events.on("screensaver:hidden", () => {
        this.pausedByScreensaver = false;
        this.lastTs = performance.now();
        this.updateAnimationState();
      });
    }
    this.updateAnimationState();
    ctx.logger.info("floating-images initialized", {
      items: this.items.length,
      selector: this.options.containerSelector
    });
  }
  destroy() {
    this.running = false;
    if (this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("resize", this.onResize);
    this.unsubScreensaverShown?.();
    this.unsubScreensaverHidden?.();
    this.unsubScreensaverShown = void 0;
    this.unsubScreensaverHidden = void 0;
    for (const item of this.items) {
      item.el.style.transform = "";
      item.el.style.willChange = "";
      item.el.style.position = "";
      item.el.style.left = "";
      item.el.style.top = "";
    }
    this.items = [];
    this.container = null;
    this.pausedByVisibility = false;
    this.pausedByScreensaver = false;
  }
  onRouteChange(_nextRoute, ctx) {
    const hasContainer = Boolean(document.querySelector(this.options.containerSelector));
    if (hasContainer && this.items.length === 0) {
      this.init(ctx);
      return;
    }
    if (!hasContainer && this.items.length > 0) {
      this.destroy();
    }
  }
  collectItems(container) {
    const containerRect = container.getBoundingClientRect();
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }
    const nodes = Array.from(container.querySelectorAll(this.options.itemSelector));
    return nodes.map((el, index) => {
      const rect = el.getBoundingClientRect();
      const width = Math.max(28, Math.round(rect.width || 48));
      const height = Math.max(28, Math.round(rect.height || 48));
      const centerX = containerRect.width * 0.5 - width * 0.5;
      const centerY = containerRect.height * 0.5 - height * 0.5;
      const spread = Math.max(24, Math.min(containerRect.width, containerRect.height) * 0.18);
      const x = clamp(centerX + gaussianRandom() * spread, 0, Math.max(0, containerRect.width - width));
      const y = clamp(centerY + gaussianRandom() * spread, 0, Math.max(0, containerRect.height - height));
      const direction = index % 2 === 0 ? 1 : -1;
      const jitter = index % 3 * 0.08;
      el.style.position = "absolute";
      el.style.left = "0";
      el.style.top = "0";
      el.style.willChange = "transform";
      return {
        el,
        x,
        y,
        vx: this.options.baseSpeed * (1 + jitter) * direction,
        vy: this.options.baseSpeed * (0.65 + jitter) * -direction,
        width,
        height
      };
    });
  }
  onVisibilityChange = () => {
    if (!this.running) return;
    if (document.visibilityState === "hidden") {
      this.pausedByVisibility = true;
      this.updateAnimationState();
      return;
    }
    this.pausedByVisibility = false;
    this.lastTs = performance.now();
    this.updateAnimationState();
  };
  onResize = () => {
    if (!this.container || this.items.length === 0) return;
    const bounds = this.getBounds();
    for (const item of this.items) {
      item.width = Math.max(28, Math.round(item.el.getBoundingClientRect().width || item.width));
      item.height = Math.max(28, Math.round(item.el.getBoundingClientRect().height || item.height));
      item.x = clamp(item.x, 0, Math.max(0, bounds.width - item.width));
      item.y = clamp(item.y, 0, Math.max(0, bounds.height - item.height));
      this.renderItem(item);
    }
  };
  tick = (ts) => {
    if (!this.running || !this.container) return;
    const dt = Math.min((ts - this.lastTs) / 1e3, 0.05);
    this.lastTs = ts;
    const bounds = this.getBounds();
    for (const item of this.items) {
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      const maxX = Math.max(0, bounds.width - item.width);
      const maxY = Math.max(0, bounds.height - item.height);
      if (item.x <= 0) {
        item.x = 0;
        item.vx = Math.abs(item.vx);
      } else if (item.x >= maxX) {
        item.x = maxX;
        item.vx = -Math.abs(item.vx);
      }
      if (item.y <= 0) {
        item.y = 0;
        item.vy = Math.abs(item.vy);
      } else if (item.y >= maxY) {
        item.y = maxY;
        item.vy = -Math.abs(item.vy);
      }
      this.renderItem(item);
    }
    this.frame = window.requestAnimationFrame(this.tick);
  };
  updateAnimationState() {
    if (!this.running) return;
    const shouldRun = !this.pausedByVisibility && !this.pausedByScreensaver;
    if (shouldRun && this.frame === null) {
      this.frame = window.requestAnimationFrame(this.tick);
      return;
    }
    if (!shouldRun && this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
  getBounds() {
    if (!this.container) return { width: 0, height: 0 };
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight
    };
  }
  renderItem(item) {
    item.el.style.transform = `translate3d(${Math.round(item.x)}px, ${Math.round(item.y)}px, 0)`;
  }
};
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// newworlddream/src/features/screensaver/ScreensaverFeature.ts
var ScreensaverFeature = class {
  name = "screensaver";
  options;
  timer = null;
  target = null;
  onActivityBound;
  events;
  ctx;
  screensaverFloating;
  constructor(options) {
    this.options = options;
    this.onActivityBound = this.onActivity.bind(this);
  }
  init(ctx) {
    this.ctx = ctx;
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
    this.stopScreensaverFloating();
    this.ctx = void 0;
    this.events = void 0;
  }
  onActivity() {
    if (!this.target) return;
    const wasVisible = !this.target.hidden;
    this.target.hidden = true;
    this.stopScreensaverFloating();
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
      this.startScreensaverFloating();
      events?.emit("user:inactive", { at: Date.now(), idleMs: this.options.idleMs });
      events?.emit("screensaver:shown", { target: this.options.targetSelector });
    }, this.options.idleMs);
  }
  startScreensaverFloating() {
    if (!this.target || !this.ctx) return;
    const floatingRoot = this.ensureFloatingRoot(this.target);
    if (!floatingRoot) return;
    if (this.screensaverFloating) {
      this.screensaverFloating.destroy();
      this.screensaverFloating = void 0;
    }
    this.screensaverFloating = new FloatingImagesFeature({
      containerSelector: `${this.options.targetSelector} [data-screensaver-floating]`,
      itemSelector: `${this.options.targetSelector} [data-screensaver-floating-item]`,
      baseSpeed: 30,
      pauseOnScreensaver: false
    });
    this.screensaverFloating.init(this.ctx);
  }
  stopScreensaverFloating() {
    this.screensaverFloating?.destroy();
    this.screensaverFloating = void 0;
  }
  ensureFloatingRoot(target) {
    let floatingRoot = target.querySelector("[data-screensaver-floating]");
    if (floatingRoot) return floatingRoot;
    floatingRoot = document.createElement("div");
    floatingRoot.setAttribute("data-screensaver-floating", "true");
    const labels = ["*", "+", "o", "x", "~", "@", "#", "[]"];
    for (let i = 0; i < 10; i += 1) {
      const item = document.createElement("div");
      item.setAttribute("data-screensaver-floating-item", "true");
      item.textContent = labels[i % labels.length];
      floatingRoot.appendChild(item);
    }
    target.appendChild(floatingRoot);
    return floatingRoot;
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
  const detachConsoleSink = maybeAttachConsoleSink(config.mode, config.logLevel);
  registry.register(new SlideshowFeature(), {
    requiredSelector: "[data-slideshow]",
    mode: "any"
  });
  registry.register(new FloatingImagesFeature(), {
    requiredSelector: "[data-floating-images]",
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
  const routeCoordinator = new RouteCoordinator({
    containerSelector: "[data-route-container]",
    logger: createLogger("router", config.logLevel),
    hooks: {
      onAfterSwap: async ({ url }) => {
        const nextCtx = {
          ...ctxForResolve,
          route: url.pathname
        };
        const nextFeatures = registry.resolve(nextCtx);
        await startup.reconcileFeatures(nextFeatures, url.pathname);
      }
    }
  });
  routeCoordinator.start();
  bindLifecycleHooks(startup, routeCoordinator, detachConsoleSink);
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
function bindLifecycleHooks(startup, routeCoordinator, detachConsoleSink) {
  window.addEventListener("beforeunload", () => {
    routeCoordinator.destroy();
    detachConsoleSink?.();
    void startup.destroy("beforeunload");
  });
}
function maybeAttachConsoleSink(mode, logLevel) {
  const sinkAttr = document.documentElement.getAttribute("data-log-sink");
  if (sinkAttr === "none") return void 0;
  if (sinkAttr === "console") {
    return attachConsoleLogSink(logLevel);
  }
  if (mode === "dev") {
    return attachConsoleLogSink(logLevel);
  }
  return void 0;
}
void main();
//# sourceMappingURL=main.js.map
