import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = mkdtempSync(join(tmpdir(), "spaceface-vnext-regression-"));
const bundlePath = join(tempDir, "vnext-regression-harness.mjs");

async function run() {
try {
  await build({
    stdin: {
      contents: `
        export { Container } from "./src/core/container.ts";
        export { FeatureRegistry } from "./src/core/feature.ts";
        export { SlideshowFeature } from "./src/features/slideshow/SlideshowFeature.ts";
        export { SlidePlayerFeature } from "./src/features/slideplayer/SlidePlayerFeature.ts";
        export { FloatingImagesFeature } from "./src/features/floating-images/FloatingImagesFeature.ts";
        export { screensaverActiveSignal } from "./src/features/shared/screensaverState.ts";
        export { globalScheduler } from "./src/core/scheduler.ts";
        export { __setWaitForImagesReady } from "mock:images";
      `,
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "vnext-regression-harness.ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: bundlePath,
    logLevel: "silent",
    plugins: [
      {
        name: "mock-images",
        setup(buildApi) {
          buildApi.onResolve({ filter: /^mock:images$/ }, () => ({ path: "mock:images", namespace: "mock-images" }));
          buildApi.onResolve({ filter: /core\/utils\/images\.js$/ }, () => ({ path: "mock:images", namespace: "mock-images" }));
          buildApi.onLoad({ filter: /.*/, namespace: "mock-images" }, () => ({
            contents: `
              let waitForImagesReadyImpl = async () => [];
              export function __setWaitForImagesReady(fn) {
                waitForImagesReadyImpl = fn;
              }
              export async function waitForImagesReady(...args) {
                return waitForImagesReadyImpl(...args);
              }
            `,
            loader: "js",
          }));
        },
      },
    ],
  });

  const runtime = await import(pathToFileURL(bundlePath).href);
  testFeatureRegistryAttributeToggling(runtime);
  testSlideshowScreensaverPause(runtime);
  testSlidePlayerScreensaverPause(runtime);
  await testFloatingImagesScreensaverPause(runtime);
  await testFloatingImagesAsyncDestroy(runtime);
  console.log("[vnext regressions] OK");
} catch (error) {
  console.error("[vnext regressions] FAILED");
  console.error(error);
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
}

function testFeatureRegistryAttributeToggling(runtime) {
  const observerState = installMutationObserverStub();
  const body = new FakeElement("body");
  installDomGlobals(body);

  class ProbeFeature {
    static selector = "probe";
    static mounts = 0;
    static destroys = 0;
    name = "probe";
    mount() {
      ProbeFeature.mounts += 1;
    }
    destroy() {
      ProbeFeature.destroys += 1;
    }
  }

  const registry = new runtime.FeatureRegistry(new runtime.Container());
  registry.register(ProbeFeature);
  registry.start();

  const host = new FakeElement("div");
  body.append(host);

  host.setAttribute("data-feature", "probe");
  observerState.callback([{ type: "attributes", target: host }]);
  assert.equal(ProbeFeature.mounts, 1, "feature should mount when data-feature is added");

  host.removeAttribute("data-feature");
  observerState.callback([{ type: "attributes", target: host }]);
  assert.equal(ProbeFeature.destroys, 1, "feature should destroy when data-feature is removed");

  registry.stop();
  restoreDomGlobals();
}

function testSlideshowScreensaverPause(runtime) {
  const clock = installFakeClock();
  const root = new FakeElement("section");
  root.append(new FakeElement("button", { "data-slide-prev": "" }));
  root.append(new FakeElement("button", { "data-slide-next": "" }));
  root.append(new FakeElement("article", { "data-slide": "" }));
  root.append(new FakeElement("article", { "data-slide": "" }, { hidden: true }));
  root.append(new FakeElement("article", { "data-slide": "" }, { hidden: true }));

  runtime.screensaverActiveSignal.value = false;
  const feature = new runtime.SlideshowFeature({ autoplayMs: 100 });
  feature.mount(root);

  assert.equal(activeIndex(root, "[data-slide]"), 0, "slideshow should start on the first slide");
  clock.advance(100);
  assert.equal(activeIndex(root, "[data-slide]"), 1, "slideshow should advance before screensaver activates");

  runtime.screensaverActiveSignal.value = true;
  clock.advance(300);
  assert.equal(activeIndex(root, "[data-slide]"), 1, "slideshow should pause while screensaver is active");

  runtime.screensaverActiveSignal.value = false;
  clock.advance(100);
  assert.equal(activeIndex(root, "[data-slide]"), 2, "slideshow should resume after screensaver hides");

  feature.destroy();
  runtime.screensaverActiveSignal.value = false;
  clock.restore();
}

function testSlidePlayerScreensaverPause(runtime) {
  const clock = installFakeClock();
  const root = new FakeElement("section");
  root.append(new FakeElement("button", { "data-slideplayer-prev": "" }));
  root.append(new FakeElement("button", { "data-slideplayer-next": "" }));

  const stage = new FakeElement("div", { "data-slideplayer-stage": "" });
  stage.append(new FakeElement("img", { "data-slideplayer-slide": "" }));
  stage.append(new FakeElement("img", { "data-slideplayer-slide": "" }, { hidden: true }));
  stage.append(new FakeElement("img", { "data-slideplayer-slide": "" }, { hidden: true }));
  root.append(stage);

  const bullets = new FakeElement("div", { "data-slideplayer-bullets": "" });
  bullets.append(new FakeElement("button", { "data-slideplayer-bullet": "" }));
  bullets.append(new FakeElement("button", { "data-slideplayer-bullet": "" }));
  bullets.append(new FakeElement("button", { "data-slideplayer-bullet": "" }));
  root.append(bullets);

  runtime.screensaverActiveSignal.value = false;
  const feature = new runtime.SlidePlayerFeature({ autoplayMs: 100 });
  feature.mount(root);

  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 0, "slideplayer should start on the first slide");
  clock.advance(100);
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 1, "slideplayer should advance before screensaver activates");

  runtime.screensaverActiveSignal.value = true;
  clock.advance(300);
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 1, "slideplayer should pause while screensaver is active");

  runtime.screensaverActiveSignal.value = false;
  clock.advance(100);
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 2, "slideplayer should resume after screensaver hides");

  feature.destroy();
  runtime.screensaverActiveSignal.value = false;
  clock.restore();
}

async function testFloatingImagesScreensaverPause(runtime) {
  installWindowForFloatingImages();
  runtime.__setWaitForImagesReady(async () => []);

  const originalAdd = runtime.globalScheduler.add.bind(runtime.globalScheduler);
  const unsubscribers = [];
  let addCalls = 0;
  runtime.globalScheduler.add = () => {
    addCalls += 1;
    const unsubscribe = spy();
    unsubscribers.push(unsubscribe);
    return unsubscribe;
  };

  try {
    runtime.screensaverActiveSignal.value = false;
    const pageRoot = createFloatingRoot();
    const pageFeature = new runtime.FloatingImagesFeature();
    await pageFeature.mount(pageRoot);

    assert.equal(addCalls, 1, "page floating images should subscribe to the scheduler on mount");

    runtime.screensaverActiveSignal.value = true;
    assert.equal(unsubscribers[0].calls, 1, "page floating images should unsubscribe when screensaver activates");

    runtime.screensaverActiveSignal.value = false;
    assert.equal(addCalls, 2, "page floating images should resubscribe when screensaver hides");
    pageFeature.destroy();

    runtime.screensaverActiveSignal.value = false;
    addCalls = 0;
    unsubscribers.length = 0;

    const screensaverHost = new FakeElement("div", { "data-screensaver": "true" });
    const screensaverRoot = createFloatingRoot();
    screensaverHost.append(screensaverRoot);

    const screensaverFeature = new runtime.FloatingImagesFeature();
    await screensaverFeature.mount(screensaverRoot);

    runtime.screensaverActiveSignal.value = true;
    assert.equal(unsubscribers[0].calls, 0, "screensaver-owned floating images must keep running during screensaver activity");
    screensaverFeature.destroy();
  } finally {
    runtime.globalScheduler.add = originalAdd;
    runtime.screensaverActiveSignal.value = false;
    restoreFloatingWindow();
  }
}

async function testFloatingImagesAsyncDestroy(runtime) {
  installWindowForFloatingImages();

  let resolveImages;
  const imagesReady = new Promise((resolve) => {
    resolveImages = resolve;
  });
  runtime.__setWaitForImagesReady(() => imagesReady);

  const originalAdd = runtime.globalScheduler.add.bind(runtime.globalScheduler);
  let addCalls = 0;
  let unsubscribeCalls = 0;
  runtime.globalScheduler.add = () => {
    addCalls += 1;
    return () => {
      unsubscribeCalls += 1;
    };
  };

  try {
    const root = createFloatingRoot();
    const item = root.querySelector("[data-floating-item]");
    const feature = new runtime.FloatingImagesFeature();
    const mountPromise = feature.mount(root);

    assert.equal(item.style.position, "absolute", "feature should prepare item positioning before images resolve");
    assert.equal(item.style.visibility, "hidden", "feature should hide items before async init finishes");

    feature.destroy();
    assert.equal(item.style.position, "", "destroy should restore prepared item position when async mount is interrupted");
    assert.equal(item.style.visibility, "", "destroy should restore prepared item visibility when async mount is interrupted");
    assert.equal(unsubscribeCalls, 1, "destroy should release the early scheduler subscription");

    resolveImages();
    await mountPromise;

    assert.equal(addCalls, 1, "destroyed async mount must not subscribe to the scheduler again after resolution");
  } finally {
    runtime.globalScheduler.add = originalAdd;
    runtime.screensaverActiveSignal.value = false;
    restoreFloatingWindow();
  }
}

function installMutationObserverStub() {
  const state = { callback: () => {} };
  globalThis.MutationObserver = class {
    constructor(callback) {
      state.callback = callback;
    }
    observe() {}
    disconnect() {}
  };
  return state;
}

let originalDocument;
let originalHTMLElement;

function installDomGlobals(body) {
  originalDocument = globalThis.document;
  originalHTMLElement = globalThis.HTMLElement;
  globalThis.document = { body };
  globalThis.HTMLElement = FakeElement;
}

function restoreDomGlobals() {
  globalThis.document = originalDocument;
  globalThis.HTMLElement = originalHTMLElement;
}

let originalWindow;
let originalGetComputedStyle;
let originalRequestAnimationFrame;
let originalCancelAnimationFrame;

function installWindowForFloatingImages() {
  originalWindow = globalThis.window;
  originalGetComputedStyle = globalThis.getComputedStyle;
  originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  originalCancelAnimationFrame = globalThis.cancelAnimationFrame;

  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.getComputedStyle = (el) => ({
    position: el.style.position || "static",
  });
  globalThis.requestAnimationFrame = (cb) => {
    cb(16);
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};
}

function restoreFloatingWindow() {
  globalThis.window = originalWindow;
  globalThis.getComputedStyle = originalGetComputedStyle;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
}

function installFakeClock() {
  const originalWindowRef = globalThis.window;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalDateNow = Date.now;

  let now = 0;
  let nextId = 1;
  const timers = new Map();

  const api = {
    setTimeout(fn, delay = 0) {
      const id = nextId += 1;
      timers.set(id, { fn, time: now + Number(delay) });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };

  globalThis.window = {
    ...(originalWindowRef ?? {}),
    setTimeout: api.setTimeout,
    clearTimeout: api.clearTimeout,
  };
  globalThis.setTimeout = api.setTimeout;
  globalThis.clearTimeout = api.clearTimeout;
  Date.now = () => now;

  return {
    advance(ms) {
      const target = now + ms;
      while (true) {
        let nextTimer = null;
        for (const [id, timer] of timers.entries()) {
          if (!nextTimer || timer.time < nextTimer.time) {
            nextTimer = { id, ...timer };
          }
        }
        if (!nextTimer || nextTimer.time > target) break;
        now = nextTimer.time;
        timers.delete(nextTimer.id);
        nextTimer.fn();
      }
      now = target;
    },
    restore() {
      globalThis.window = originalWindowRef;
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
      Date.now = originalDateNow;
    },
  };
}

function activeIndex(root, selector) {
  return root.querySelectorAll(selector).findIndex((node) => !node.hidden);
}

function createFloatingRoot() {
  const root = new FakeElement("div");
  root.clientWidth = 320;
  root.clientHeight = 240;
  root.append(new FakeElement("div", { "data-floating-item": "true" }, { width: 48, height: 48 }));
  root.append(new FakeElement("div", { "data-floating-item": "true" }, { width: 48, height: 48 }));
  return root;
}

function spy() {
  const fn = () => {
    fn.calls += 1;
  };
  fn.calls = 0;
  return fn;
}

class FakeElement {
  constructor(tagName, attributes = {}, options = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attributes).map(([k, v]) => [k, String(v)]));
    this.children = [];
    this.parentElement = null;
    this.hidden = Boolean(options.hidden);
    this.style = {};
    this.clientWidth = options.width ?? 0;
    this.clientHeight = options.height ?? 0;
    this.listeners = new Map();
    this.classSet = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classSet.add(name)),
      remove: (...names) => names.forEach((name) => this.classSet.delete(name)),
      toggle: (name, force) => {
        if (force === undefined) {
          if (this.classSet.has(name)) {
            this.classSet.delete(name);
            return false;
          }
          this.classSet.add(name);
          return true;
        }
        if (force) {
          this.classSet.add(name);
          return true;
        }
        this.classSet.delete(name);
        return false;
      },
      contains: (name) => this.classSet.has(name),
    };
  }

  append(...children) {
    for (const child of children) {
      child.parentElement = this;
      this.children.push(child);
    }
  }

  prepend(child) {
    child.parentElement = this;
    this.children.unshift(child);
  }

  remove() {
    if (!this.parentElement) return;
    const index = this.parentElement.children.indexOf(this);
    if (index >= 0) {
      this.parentElement.children.splice(index, 1);
    }
    this.parentElement = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  matches(selector) {
    return selector.split(",").some((part) => matchSelector(this, part.trim()));
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches(selector)) return node;
      node = node.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const selectors = selector.split(",").map((part) => part.trim()).filter(Boolean);
    const results = [];

    const visit = (node) => {
      for (const child of node.children) {
        if (selectors.some((entry) => matchSelector(child, entry))) {
          results.push(child);
        }
        visit(child);
      }
    };

    visit(this);
    return results;
  }

  addEventListener(type, handler) {
    const list = this.listeners.get(type) ?? [];
    list.push(handler);
    this.listeners.set(type, list);
  }

  removeEventListener(type, handler) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      list.filter((entry) => entry !== handler),
    );
  }

  getBoundingClientRect() {
    return {
      width: this.clientWidth || 48,
      height: this.clientHeight || 48,
      top: 0,
      left: 0,
      right: this.clientWidth || 48,
      bottom: this.clientHeight || 48,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  }
}

function matchSelector(node, selector) {
  if (!selector) return false;
  if (selector === ":scope") return true;

  const attrMatch = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
  if (attrMatch) {
    const [, name, value] = attrMatch;
    const current = node.getAttribute(name);
    if (value === undefined) return current !== null;
    return current === value;
  }

  if (selector.startsWith(".")) {
    return node.classList.contains(selector.slice(1));
  }

  return false;
}

await run();
