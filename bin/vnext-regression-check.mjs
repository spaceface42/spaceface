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
        export { FeatureRegistry } from "./src/core/feature.ts";
        export { SlideshowFeature } from "./src/features/slideshow/SlideshowFeature.ts";
        export { SlidePlayerFeature } from "./src/features/slideplayer/SlidePlayerFeature.ts";
        export { FloatingImagesFeature } from "./src/features/floating-images/FloatingImagesFeature.ts";
        export { ScreensaverFeature } from "./src/features/screensaver/ScreensaverFeature.ts";
        export { screensaverActiveSignal } from "./src/features/shared/screensaverState.ts";
        export { userActivitySignal, initActivityTracking, destroyActivityTracking } from "./src/features/shared/activity.ts";
        export { globalScheduler } from "./src/core/scheduler.ts";
        export { __setWaitForImagesReady } from "mock:images";
        export { __setLoadPartialHtml } from "mock:partials";
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
      {
        name: "mock-partials",
        setup(buildApi) {
          buildApi.onResolve({ filter: /^mock:partials$/ }, () => ({ path: "mock:partials", namespace: "mock-partials" }));
          buildApi.onResolve({ filter: /core\/partials\.js$/ }, () => ({ path: "mock:partials", namespace: "mock-partials" }));
          buildApi.onLoad({ filter: /.*/, namespace: "mock-partials" }, () => ({
            contents: `
              let loadPartialHtmlImpl = async () => "";
              export function __setLoadPartialHtml(fn) {
                loadPartialHtmlImpl = fn;
              }
              export async function loadPartialHtml(...args) {
                return loadPartialHtmlImpl(...args);
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
  testFeatureRegistryMountContext(runtime);
  await testFeatureRegistryAsyncMountFailure(runtime);
  await testFeatureRegistryAsyncMountAbort(runtime);
  testSlideshowScreensaverPause(runtime);
  testSlidePlayerScreensaverPause(runtime);
  testSlidePlayerKeyboardNavigation(runtime);
  testSlidePlayerSwipeNavigation(runtime);
  testSlidePlayerTouchSwipeNavigation(runtime);
  await testActivityTracking(runtime);
  await testScreensaverLoadFailure(runtime);
  await testScreensaverLoadAbort(runtime);
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
    static mounts = 0;
    static destroys = 0;
    mount() {
      ProbeFeature.mounts += 1;
    }
    destroy() {
      ProbeFeature.destroys += 1;
    }
  }

  const registry = new runtime.FeatureRegistry();
  registry.register(createDefinition("probe", () => new ProbeFeature()));
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

function testFeatureRegistryMountContext(runtime) {
  const observerState = installMutationObserverStub();
  const body = new FakeElement("body");
  installDomGlobals(body);

  let receivedContext = null;
  class ContextProbeFeature {
    mount(_el, context) {
      receivedContext = context;
    }
  }

  const registry = new runtime.FeatureRegistry();
  registry.register(createDefinition("context-probe", () => new ContextProbeFeature()));
  registry.start();

  const host = new FakeElement("div");
  body.append(host);

  host.setAttribute("data-feature", "context-probe");
  observerState.callback([{ type: "attributes", target: host }]);

  assert.equal(receivedContext?.signal instanceof AbortSignal, true, "feature mounts should receive an abort signal");
  assert.equal(typeof receivedContext?.logger?.warn, "function", "feature mounts should receive a scoped logger");
  assert.equal(typeof receivedContext?.logger?.child, "function", "feature mounts should receive a composable logger");

  registry.stop();
  restoreDomGlobals();
}

async function testFeatureRegistryAsyncMountFailure(runtime) {
  const observerState = installMutationObserverStub();
  const body = new FakeElement("body");
  installDomGlobals(body);

  const originalQueueMicrotask = globalThis.queueMicrotask;
  const surfacedErrors = [];
  globalThis.queueMicrotask = (fn) => {
    surfacedErrors.push(fn);
  };

  class AsyncProbeFeature {
    static mounts = 0;
    static destroys = 0;
    async mount() {
      AsyncProbeFeature.mounts += 1;
      throw new Error("async mount failed");
    }
    destroy() {
      AsyncProbeFeature.destroys += 1;
    }
  }

  try {
    const registry = new runtime.FeatureRegistry();
    registry.register(createDefinition("async-probe", () => new AsyncProbeFeature()));
    registry.start();

    const host = new FakeElement("div");
    body.append(host);

    host.setAttribute("data-feature", "async-probe");
    observerState.callback([{ type: "attributes", target: host }]);
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(AsyncProbeFeature.mounts, 1, "async feature should attempt to mount when activated");
    assert.equal(AsyncProbeFeature.destroys, 1, "failed async mount should destroy the feature instance");
    assert.equal(surfacedErrors.length, 1, "failed async mount should surface its error");
    assert.throws(() => {
      surfacedErrors[0]();
    }, /async mount failed/);

    registry.stop();
  } finally {
    globalThis.queueMicrotask = originalQueueMicrotask;
    restoreDomGlobals();
  }
}

async function testFeatureRegistryAsyncMountAbort(runtime) {
  const observerState = installMutationObserverStub();
  const body = new FakeElement("body");
  installDomGlobals(body);

  const originalQueueMicrotask = globalThis.queueMicrotask;
  const surfacedErrors = [];
  globalThis.queueMicrotask = (fn) => {
    surfacedErrors.push(fn);
  };

  class AbortProbeFeature {
    static destroys = 0;
    static aborts = 0;
    mount(_el, context) {
      return new Promise((_, reject) => {
        context?.signal.addEventListener(
          "abort",
          () => {
            AbortProbeFeature.aborts += 1;
            const error = new Error("mount aborted");
            error.name = "AbortError";
            reject(error);
          },
          { once: true }
        );
      });
    }
    destroy() {
      AbortProbeFeature.destroys += 1;
    }
  }

  try {
    const registry = new runtime.FeatureRegistry();
    registry.register(createDefinition("abort-probe", () => new AbortProbeFeature()));
    registry.start();

    const host = new FakeElement("div");
    body.append(host);

    host.setAttribute("data-feature", "abort-probe");
    observerState.callback([{ type: "attributes", target: host }]);

    host.removeAttribute("data-feature");
    observerState.callback([{ type: "attributes", target: host }]);
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(AbortProbeFeature.aborts, 1, "removing a feature should abort an in-flight async mount");
    assert.equal(AbortProbeFeature.destroys, 1, "aborted async mounts should still destroy the feature instance");
    assert.equal(surfacedErrors.length, 0, "aborted async mounts should not surface abort errors");

    registry.stop();
  } finally {
    globalThis.queueMicrotask = originalQueueMicrotask;
    restoreDomGlobals();
  }
}

function testSlideshowScreensaverPause(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);
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
  restoreDomGlobals();
}

function createDefinition(selector, create) {
  return { selector, create };
}

function testSlidePlayerScreensaverPause(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);
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
  restoreDomGlobals();
}

function testSlidePlayerKeyboardNavigation(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createSlidePlayerRoot();
  body.append(root);

  runtime.screensaverActiveSignal.value = false;
  const feature = new runtime.SlidePlayerFeature({ autoplayMs: 0 });
  feature.mount(root);

  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 0, "slideplayer keyboard test should start on the first slide");

  dispatchDocumentEvent("keydown", {
    key: "ArrowRight",
    target: body,
    preventDefault() {
      this.defaultPrevented = true;
    },
  });
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 1, "ArrowRight should advance the slideplayer");

  dispatchDocumentEvent("keydown", {
    key: "ArrowLeft",
    target: body,
    preventDefault() {
      this.defaultPrevented = true;
    },
  });
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 0, "ArrowLeft should move the slideplayer backward");

  feature.destroy();
  runtime.screensaverActiveSignal.value = false;
  restoreDomGlobals();
}

function testSlidePlayerSwipeNavigation(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createSlidePlayerRoot();
  body.append(root);

  runtime.screensaverActiveSignal.value = false;
  const feature = new runtime.SlidePlayerFeature({ autoplayMs: 0 });
  feature.mount(root);

  const stage = root.querySelector("[data-slideplayer-stage]");
  dispatchElementEvent(stage, "pointerdown", { pointerId: 1, clientX: 120, clientY: 80, button: 0 });
  assert.equal(stage.hasPointerCapture(1), true, "pointer swipe should capture the active pointer");
  dispatchElementEvent(stage, "pointerup", { pointerId: 1, clientX: 40, clientY: 84, button: 0 });
  assert.equal(stage.hasPointerCapture(1), false, "pointer swipe should release capture after completion");
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 1, "left swipe should advance the slideplayer");

  dispatchElementEvent(stage, "pointerdown", { pointerId: 2, clientX: 40, clientY: 80, button: 0 });
  dispatchElementEvent(stage, "pointerup", { pointerId: 2, clientX: 120, clientY: 82, button: 0 });
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 0, "right swipe should move the slideplayer backward");

  feature.destroy();
  runtime.screensaverActiveSignal.value = false;
  restoreDomGlobals();
}

async function testActivityTracking(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);
  runtime.__setLoadPartialHtml(async () => "<div class='screensaver-label'>ok</div>");

  try {
    runtime.destroyActivityTracking();
    runtime.initActivityTracking();
    runtime.screensaverActiveSignal.value = false;

    const root = new FakeElement("div", { "data-screensaver": "true" }, { hidden: true });
    body.append(root);

    const feature = new runtime.ScreensaverFeature({
      idleMs: 100,
      partialUrl: "./ok.html",
    });
    feature.mount(root);

    clock.advance(90);
    dispatchDocumentEvent("wheel", {});
    clock.advance(20);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(runtime.screensaverActiveSignal.value, false, "wheel activity should reset the screensaver timer");

    clock.advance(90);
    document.visibilityState = "visible";
    dispatchDocumentEvent("visibilitychange", {});
    clock.advance(20);
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(runtime.screensaverActiveSignal.value, false, "visibility changes to a visible tab should reset the screensaver timer");

    feature.destroy();
  } finally {
    runtime.screensaverActiveSignal.value = false;
    runtime.destroyActivityTracking();
    clock.restore();
    restoreDomGlobals();
  }
}

async function testScreensaverLoadFailure(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);
  runtime.__setLoadPartialHtml(async () => {
    throw new Error("missing partial");
  });

  try {
    runtime.screensaverActiveSignal.value = false;
    runtime.userActivitySignal.value = 0;

    const root = new FakeElement("div", { "data-screensaver": "true" }, { hidden: true });
    body.append(root);

    const feature = new runtime.ScreensaverFeature({
      idleMs: 100,
      partialUrl: "./missing.html",
    });

    feature.mount(root);
    clock.advance(100);
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(root.hidden, true, "screensaver host should stay hidden when the partial fails to load");
    assert.equal(root.classList.contains("is-active"), false, "screensaver host should not activate on partial load failure");
    assert.equal(runtime.screensaverActiveSignal.value, false, "screensaver failures must not pause the rest of the page");

    feature.destroy();
  } finally {
    runtime.screensaverActiveSignal.value = false;
    clock.restore();
    restoreDomGlobals();
  }
}

async function testScreensaverLoadAbort(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);

  let aborts = 0;
  runtime.__setLoadPartialHtml((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener(
      "abort",
      () => {
        aborts += 1;
        const error = new Error("partial load aborted");
        error.name = "AbortError";
        reject(error);
      },
      { once: true }
    );
  }));

  try {
    runtime.screensaverActiveSignal.value = false;
    runtime.userActivitySignal.value = 0;

    const root = new FakeElement("div", { "data-screensaver": "true" }, { hidden: true });
    body.append(root);

    const feature = new runtime.ScreensaverFeature({
      idleMs: 100,
      partialUrl: "./slow.html",
    });

    feature.mount(root);
    clock.advance(100);
    runtime.userActivitySignal.value = 1;
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(aborts, 1, "screensaver activity reset should abort an in-flight partial load");
    assert.equal(runtime.screensaverActiveSignal.value, false, "aborted screensaver loads must not activate the shared pause state");
    assert.equal(root.hidden, true, "aborted screensaver loads must keep the host hidden");

    feature.destroy();
  } finally {
    runtime.screensaverActiveSignal.value = false;
    clock.restore();
    restoreDomGlobals();
  }
}

function testSlidePlayerTouchSwipeNavigation(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createSlidePlayerRoot();
  body.append(root);

  runtime.screensaverActiveSignal.value = false;
  const feature = new runtime.SlidePlayerFeature({ autoplayMs: 0 });
  feature.mount(root);

  const stage = root.querySelector("[data-slideplayer-stage]");
  dispatchElementEvent(stage, "touchstart", {
    changedTouches: [{ clientX: 120, clientY: 80 }],
  });
  dispatchElementEvent(stage, "touchend", {
    changedTouches: [{ clientX: 40, clientY: 83 }],
  });
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 1, "left touch swipe should advance the slideplayer");

  dispatchElementEvent(stage, "touchstart", {
    changedTouches: [{ clientX: 40, clientY: 80 }],
  });
  dispatchElementEvent(stage, "touchend", {
    changedTouches: [{ clientX: 120, clientY: 82 }],
  });
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 0, "right touch swipe should move the slideplayer backward");

  feature.destroy();
  runtime.screensaverActiveSignal.value = false;
  restoreDomGlobals();
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
let documentListeners = new Map();

function installDomGlobals(body) {
  originalDocument = globalThis.document;
  originalHTMLElement = globalThis.HTMLElement;
  documentListeners = new Map();
  globalThis.document = {
    body,
    visibilityState: "visible",
    addEventListener(type, handler) {
      const list = documentListeners.get(type) ?? [];
      list.push(handler);
      documentListeners.set(type, list);
    },
    removeEventListener(type, handler) {
      const list = documentListeners.get(type) ?? [];
      documentListeners.set(
        type,
        list.filter((entry) => entry !== handler),
      );
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
  globalThis.HTMLElement = FakeElement;
}

function restoreDomGlobals() {
  globalThis.document = originalDocument;
  globalThis.HTMLElement = originalHTMLElement;
  documentListeners = new Map();
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

function createSlidePlayerRoot() {
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
    this.pointerCaptures = new Set();
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

  setPointerCapture(pointerId) {
    this.pointerCaptures.add(pointerId);
  }

  hasPointerCapture(pointerId) {
    return this.pointerCaptures.has(pointerId);
  }

  releasePointerCapture(pointerId) {
    this.pointerCaptures.delete(pointerId);
  }
}

function dispatchDocumentEvent(type, event) {
  const handlers = documentListeners.get(type) ?? [];
  for (const handler of handlers) {
    handler(event);
  }
}

function dispatchElementEvent(node, type, event) {
  const handlers = node.listeners.get(type) ?? [];
  for (const handler of handlers) {
    handler(event);
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
