import assert from "node:assert/strict";
import { runBundledCheck } from "./lib/run-bundled-check.mjs";

async function run() {
  await runBundledCheck(
    {
      label: "regressions",
      tempPrefix: "spaceface-regression-check-",
      bundleFile: "regression-check-harness.mjs",
      sourcefile: "regression-check-harness.ts",
      contents: `
        export { FeatureRegistry } from "./src/core/feature.ts";
        export { initStartupSequence } from "./app/startup/initStartupSequence.ts";
        export { SlideshowFeature } from "./src/features/slideshow/SlideshowFeature.ts";
        export { SlidePlayerFeature } from "./src/features/slideplayer/SlidePlayerFeature.ts";
        export { FloatingImagesFeature } from "./src/features/floating-images/FloatingImagesFeature.ts";
        export { PortfolioStageFeature } from "./src/features/portfolio-stage/PortfolioStageFeature.ts";
        export { ScreensaverFeature } from "./src/features/screensaver/ScreensaverFeature.ts";
        export { screensaverActiveSignal } from "./src/features/shared/screensaverState.ts";
        export { userActivitySignal, initActivityTracking, destroyActivityTracking } from "./src/features/shared/activity.ts";
        export { globalScheduler } from "./src/core/scheduler.ts";
        export { __setWaitForImagesReady } from "mock:images";
        export { __setLoadPartialHtml } from "mock:partials";
      `,
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
    },
    async (runtime) => {
      testFeatureRegistryAttributeToggling(runtime);
      testFeatureRegistryMountContext(runtime);
      await testFeatureRegistryAsyncMountFailure(runtime);
      await testFeatureRegistryAsyncMountAbort(runtime);
      testStartupSequenceNoopWhenMarkupIsIncomplete(runtime);
      testStartupSequenceCompletesAndRequiresExplicitReplay(runtime);
      testStartupSequenceKeepsNestedLayoutsMounted(runtime);
      testSlideshowScreensaverPause(runtime);
      testSlideshowAutoplayResumeUsesRemainingTime(runtime);
      testSlideshowManualNavigationResetsAutoplay(runtime);
      testSlidePlayerScreensaverPause(runtime);
      testSlidePlayerAutoplayResumeUsesRemainingTime(runtime);
      testSlidePlayerManualNavigationResetsAutoplay(runtime);
      testSlidePlayerKeyboardNavigation(runtime);
      testSlidePlayerSingletonKeyboardBinding(runtime);
      testSlidePlayerSwipeNavigation(runtime);
      testSlidePlayerTouchSwipeNavigation(runtime);
      testPortfolioStageSingletonKeyboardBinding(runtime);
      testPortfolioStageDestroyRestoresAuthoredDom(runtime);
      await testPortfolioStageWrapEntersFromDestinationSide(runtime);
      await testPortfolioStageNavigationAndFiltering(runtime);
      testPortfolioStageBlankClickUsesLiveRects(runtime);
      await testActivityTracking(runtime);
      await testScreensaverManualShortcut(runtime);
      await testScreensaverSceneSelection(runtime);
      await testScreensaverCustomIdleDelay(runtime);
      await testScreensaverLoadFailure(runtime);
      await testScreensaverLoadAbort(runtime);
      await testScreensaverHideWaitsForTransitionDelay(runtime);
      testScreensaverSingletonBinding(runtime);
      testScreensaverDestroyRemovesInjectedMarkup(runtime);
      await testFloatingImagesScreensaverPause(runtime);
      await testFloatingImagesContainerResize(runtime);
      await testFloatingImagesAsyncDestroy(runtime);
      await testFloatingImagesRestoreInlineStyles(runtime);
    }
  );
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

function testStartupSequenceNoopWhenMarkupIsIncomplete(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = new FakeElement(
    "div",
    {
      "data-startup-sequence": "",
      "data-layout-target": "#app",
    },
    { hidden: true }
  );
  root.append(new FakeElement("div", { "data-startup-splash": "" }));
  body.append(root);
  body.append(new FakeElement("main", { id: "app", "data-startup-layout": "" }));

  const handle = runtime.initStartupSequence();
  assert.equal(handle, null, "startup sequence should no-op when required child markup is missing");
  assert.equal(body.classList.contains("has-startup-lock"), false, "startup no-ops should not lock scrolling");
  assert.equal(root.hidden, true, "startup no-ops should preserve authored hidden state");

  restoreDomGlobals();
}

function testStartupSequenceCompletesAndRequiresExplicitReplay(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createStartupSequenceRoot({ hidden: true, layoutTarget: "#app" });
  const layout = new FakeElement("main", { id: "app", "data-startup-layout": "" });
  body.append(root);
  body.append(layout);

  const handle = runtime.initStartupSequence({ exitMs: 24 });
  assert.notEqual(handle, null, "startup sequence should initialize when the authored contract is present");
  assert.equal(root.hidden, false, "external startup roots should unhide while active");
  assert.equal(root.classList.contains("is-startup-active"), true, "startup root should receive the active class");
  assert.equal(layout.classList.contains("is-startup-layout-hidden"), true, "target layout should stay hidden during the intro");
  assert.equal(body.classList.contains("has-startup-lock"), true, "startup sequence should lock page scrolling during playback");

  clock.advance(40);
  assert.equal(root.classList.contains("is-startup-intro-visible"), true, "startup intro should become visible after its delay");
  assert.equal(
    root.querySelector("[data-startup-intro]").classList.contains("is-hidden"),
    false,
    "startup intro should remove the hidden helper class once revealed"
  );

  clock.advance(60);
  assert.equal(root.getAttribute("data-startup-complete"), "true", "startup sequence should mark completed roots");
  assert.equal(layout.classList.contains("is-startup-layout-hidden"), false, "layout should be revealed when startup completes");
  assert.equal(body.classList.contains("has-startup-lock"), false, "scrolling should unlock once startup completes");

  clock.advance(24);
  assert.equal(root.hidden, true, "external startup roots should hide again after exit cleanup");
  assert.equal(root.classList.contains("is-startup-active"), false, "startup cleanup should remove runtime classes");

  const skippedHandle = runtime.initStartupSequence();
  assert.notEqual(skippedHandle, null, "completed startup roots should still return a safe handle");
  assert.equal(root.classList.contains("is-startup-active"), false, "completed startup roots should not replay by default");

  runtime.initStartupSequence({ replay: true, exitMs: 0 });
  assert.equal(root.classList.contains("is-startup-active"), true, "startup sequence should replay when explicitly requested");

  clock.restore();
  restoreDomGlobals();
}

function testStartupSequenceKeepsNestedLayoutsMounted(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createStartupSequenceRoot({ nestedLayout: true });
  body.append(root);

  const handle = runtime.initStartupSequence({ exitMs: 12 });
  assert.notEqual(handle, null, "startup sequence should support layouts nested inside the startup root");

  clock.advance(100);
  clock.advance(12);

  assert.equal(root.hidden, false, "nested startup roots should remain mounted after cleanup");
  assert.equal(
    root.querySelector("[data-startup-layout]").classList.contains("is-startup-layout-hidden"),
    false,
    "nested layouts should be revealed when the intro finishes"
  );

  clock.restore();
  restoreDomGlobals();
}

function testSlideshowScreensaverPause(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);
  const root = createSlideshowRoot();
  body.append(root);

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

function testSlideshowAutoplayResumeUsesRemainingTime(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);
  const root = createSlideshowRoot();
  body.append(root);

  runtime.screensaverActiveSignal.value = false;
  const feature = new runtime.SlideshowFeature({ autoplayMs: 100 });
  feature.mount(root);

  assert.equal(activeIndex(root, "[data-slide]"), 0, "slideshow timing test should start on the first slide");

  clock.advance(40);
  runtime.screensaverActiveSignal.value = true;
  clock.advance(200);
  assert.equal(activeIndex(root, "[data-slide]"), 0, "slideshow should stay paused while the screensaver is active");

  runtime.screensaverActiveSignal.value = false;
  clock.advance(59);
  assert.equal(activeIndex(root, "[data-slide]"), 0, "slideshow should wait for its saved remaining autoplay time after resuming");

  clock.advance(1);
  assert.equal(activeIndex(root, "[data-slide]"), 1, "slideshow should resume using the remaining autoplay time");

  feature.destroy();
  runtime.screensaverActiveSignal.value = false;
  clock.restore();
  restoreDomGlobals();
}

function testSlideshowManualNavigationResetsAutoplay(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);
  const root = createSlideshowRoot();
  body.append(root);

  runtime.screensaverActiveSignal.value = false;
  const feature = new runtime.SlideshowFeature({ autoplayMs: 100 });
  feature.mount(root);

  clock.advance(40);
  dispatchElementEvent(root.querySelector("[data-slide-next]"), "click", {});
  assert.equal(activeIndex(root, "[data-slide]"), 1, "manual slideshow navigation should advance immediately");

  clock.advance(99);
  assert.equal(activeIndex(root, "[data-slide]"), 1, "manual slideshow navigation should reset the autoplay timer");

  clock.advance(1);
  assert.equal(activeIndex(root, "[data-slide]"), 2, "slideshow should autoplay after the reset interval elapses");

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
  const root = createSlidePlayerRoot();
  body.append(root);

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

function testSlidePlayerAutoplayResumeUsesRemainingTime(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createSlidePlayerRoot();
  body.append(root);

  runtime.screensaverActiveSignal.value = false;
  const feature = new runtime.SlidePlayerFeature({ autoplayMs: 100 });
  feature.mount(root);

  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 0, "slideplayer timing test should start on the first slide");

  clock.advance(40);
  runtime.screensaverActiveSignal.value = true;
  clock.advance(200);
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 0, "slideplayer should stay paused while the screensaver is active");

  runtime.screensaverActiveSignal.value = false;
  clock.advance(59);
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 0, "slideplayer should wait for its saved remaining autoplay time after resuming");

  clock.advance(1);
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 1, "slideplayer should resume using the remaining autoplay time");

  feature.destroy();
  runtime.screensaverActiveSignal.value = false;
  clock.restore();
  restoreDomGlobals();
}

function testSlidePlayerManualNavigationResetsAutoplay(runtime) {
  const clock = installFakeClock();
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createSlidePlayerRoot();
  body.append(root);

  runtime.screensaverActiveSignal.value = false;
  const feature = new runtime.SlidePlayerFeature({ autoplayMs: 100 });
  feature.mount(root);

  clock.advance(40);
  dispatchElementEvent(root.querySelectorAll("[data-slideplayer-bullet]")[2], "click", {});
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 2, "slideplayer bullet navigation should activate the requested slide");

  clock.advance(99);
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 2, "slideplayer bullet navigation should reset the autoplay timer");

  clock.advance(1);
  assert.equal(activeIndex(root, "[data-slideplayer-slide]"), 0, "slideplayer should autoplay after the reset interval elapses");

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

function testSlidePlayerSingletonKeyboardBinding(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const firstRoot = createSlidePlayerRoot();
  const secondRoot = createSlidePlayerRoot();
  body.append(firstRoot);
  body.append(secondRoot);

  runtime.screensaverActiveSignal.value = false;
  const firstFeature = new runtime.SlidePlayerFeature({ autoplayMs: 0 });
  const secondFeature = new runtime.SlidePlayerFeature({ autoplayMs: 0 });
  firstFeature.mount(firstRoot);
  secondFeature.mount(secondRoot);

  assert.equal((documentListeners.get("keydown") ?? []).length, 1, "only one slideplayer should bind the global keyboard handler");

  dispatchDocumentEvent("keydown", {
    key: "ArrowRight",
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault() {},
    target: firstRoot,
  });

  assert.equal(activeIndex(firstRoot, "[data-slideplayer-slide]"), 1, "the first slideplayer should retain global keyboard ownership");
  assert.equal(activeIndex(secondRoot, "[data-slideplayer-slide]"), 0, "duplicate slideplayers must not bind a second global keyboard handler");

  secondFeature.destroy();
  firstFeature.destroy();
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
      scenePartialUrls: {
        "floating-images": "./ok.html",
      },
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

async function testScreensaverManualShortcut(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);
  const clock = installFakeClock();
  const originalGetComputedStyle = globalThis.getComputedStyle;

  globalThis.window.getComputedStyle = () => ({
    transitionDuration: "0ms",
    transitionDelay: "0ms",
  });
  globalThis.getComputedStyle = globalThis.window.getComputedStyle;
  runtime.__setLoadPartialHtml(async () => "<div class='screensaver-label'>ok</div>");
  runtime.screensaverActiveSignal.value = false;
  runtime.destroyActivityTracking();
  runtime.initActivityTracking();

  try {
    const root = new FakeElement("div", { "data-screensaver": "true" }, { hidden: true });
    body.append(root);

    const feature = new runtime.ScreensaverFeature({
      idleMs: 500,
      scenePartialUrls: {
        "floating-images": "/partial/screensaver.html",
      },
    });
    feature.mount(root);

    const shortcutEvent = {
      key: ">",
      code: "Period",
      ctrlKey: true,
      altKey: false,
      metaKey: false,
      shiftKey: true,
      repeat: false,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      target: body,
    };

    dispatchDocumentEvent("keydown", shortcutEvent);
    await flushMicrotasks(4);

    assert.equal(shortcutEvent.defaultPrevented, true, "manual shortcut should prevent the browser default");
    assert.equal(root.hidden, false, "manual shortcut should show the screensaver immediately");
    assert.equal(runtime.screensaverActiveSignal.value, true, "manual shortcut should toggle the shared screensaver state");

    clock.advance(1);
    dispatchDocumentEvent("pointerdown", { target: body });
    clock.advance(0);

    assert.equal(runtime.screensaverActiveSignal.value, false, "activity after a manual start should hide the screensaver");
    assert.equal(root.hidden, true, "manual-started screensaver should hide after the next activity");

    feature.destroy();
  } finally {
    runtime.destroyActivityTracking();
    runtime.screensaverActiveSignal.value = false;
    globalThis.getComputedStyle = originalGetComputedStyle;
    clock.restore();
    restoreDomGlobals();
  }
}

async function testScreensaverSceneSelection(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);
  let requestedUrl = "";
  runtime.__setLoadPartialHtml(async (url) => {
    requestedUrl = String(url);
    return "<div class='scene-shell'>ok</div>";
  });

  try {
    const root = new FakeElement("div", { "data-screensaver": "true", "data-screensaver-scene": "attractor" }, { hidden: true });
    body.append(root);

    const feature = new runtime.ScreensaverFeature({
      defaultScene: "floating-images",
      scenePartialUrls: {
        "floating-images": "/partial/floating-images.html",
        attractor: "/partial/attractor.html",
      },
    });

    feature.target = root;
    await feature.showScreensaver(0, "manual");

    assert.equal(requestedUrl, "/partial/attractor.html", "screensaver should load the partial for the authored scene");
    assert.equal(feature.loadedSceneId, "attractor", "screensaver should remember which scene is mounted");
  } finally {
    runtime.screensaverActiveSignal.value = false;
    restoreDomGlobals();
  }
}

async function testScreensaverCustomIdleDelay(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);
  const clock = installFakeClock();
  runtime.__setLoadPartialHtml(async () => "<div class='screensaver-label'>ok</div>");

  try {
    runtime.destroyActivityTracking();
    runtime.initActivityTracking();
    runtime.screensaverActiveSignal.value = false;

    const root = new FakeElement(
      "div",
      {
        "data-screensaver": "true",
        "data-screensaver-idle-ms": "200",
      },
      { hidden: true }
    );
    body.append(root);

    const feature = new runtime.ScreensaverFeature({
      idleMs: 100,
      defaultScene: "floating-images",
      scenePartialUrls: {
        "floating-images": "/partial/floating-images.html",
      },
    });
    feature.mount(root);

    clock.advance(100);
    await flushMicrotasks(4);
    assert.equal(root.hidden, true, "screensaver should respect a host-specific idle delay before activating");

    clock.advance(100);
    await flushMicrotasks(4);
    assert.equal(root.hidden, false, "screensaver should activate after the host-specific idle delay elapses");

    feature.destroy();
  } finally {
    runtime.destroyActivityTracking();
    runtime.screensaverActiveSignal.value = false;
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
      scenePartialUrls: {
        "floating-images": "./missing.html",
      },
    });

    feature.mount(root);
    clock.advance(100);
    await flushMicrotasks(4);

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
      scenePartialUrls: {
        "floating-images": "./slow.html",
      },
    });

    feature.mount(root);
    clock.advance(100);
    runtime.userActivitySignal.value = 1;
    await flushMicrotasks(2);

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

async function testScreensaverHideWaitsForTransitionDelay(runtime) {
  const clock = installFakeClock();
  const originalGetComputedStyle = globalThis.getComputedStyle;

  globalThis.window.getComputedStyle = () => ({
    transitionDuration: "200ms",
    transitionDelay: "150ms",
  });
  globalThis.getComputedStyle = globalThis.window.getComputedStyle;

  try {
    const root = new FakeElement("div", { "data-screensaver": "true" });
    const feature = new runtime.ScreensaverFeature();
    feature.target = root;
    feature.isShowing = true;
    feature.partialLoaded = true;
    runtime.screensaverActiveSignal.value = true;

    feature.hideScreensaver();
    clock.advance(300);
    assert.equal(root.hidden, false, "screensaver should stay visible until delay plus duration has elapsed");
    assert.equal(runtime.screensaverActiveSignal.value, true, "screensaver should keep the shared active state until the hide transition completes");

    clock.advance(60);
    assert.equal(root.hidden, true, "screensaver should hide after delay plus duration completes");
    assert.equal(runtime.screensaverActiveSignal.value, false, "screensaver should release the shared active state after the hide transition completes");
    assert.equal(feature.partialLoaded, true, "screensaver should keep the current scene mounted between activations");
  } finally {
    runtime.screensaverActiveSignal.value = false;
    globalThis.getComputedStyle = originalGetComputedStyle;
    clock.restore();
  }
}

function testScreensaverSingletonBinding(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);
  const clock = installFakeClock();

  const warnSpy = spy();
  const logger = {
    child() {
      return this;
    },
    debug() {},
    info() {},
    warn() {
      warnSpy();
    },
    error() {},
  };

  try {
    const firstRoot = new FakeElement("div", { "data-screensaver": "true" }, { hidden: true });
    const secondRoot = new FakeElement("div", { "data-screensaver": "true" }, { hidden: true });
    body.append(firstRoot);
    body.append(secondRoot);

    const firstFeature = new runtime.ScreensaverFeature({
      scenePartialUrls: {
        "floating-images": "/partial/floating-images.html",
      },
    });
    firstFeature.mount(firstRoot, { signal: new AbortController().signal, logger });

    const secondFeature = new runtime.ScreensaverFeature({
      scenePartialUrls: {
        "floating-images": "/partial/floating-images.html",
      },
    });
    secondFeature.mount(secondRoot, { signal: new AbortController().signal, logger });

    assert.equal((documentListeners.get("keydown") ?? []).length, 1, "only one screensaver should bind the global shortcut listener");
    assert.equal(warnSpy.calls, 1, "duplicate screensaver mounts should warn at runtime");

    secondFeature.destroy();
    firstFeature.destroy();
  } finally {
    runtime.screensaverActiveSignal.value = false;
    clock.restore();
    restoreDomGlobals();
  }
}

function testScreensaverDestroyRemovesInjectedMarkup(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  try {
    const root = new FakeElement("div", { "data-screensaver": "true" });
    const partialMount = new FakeElement("div", { "data-screensaver-partial": "true" });
    const floatingRoot = new FakeElement("div", { "data-feature": "floating-images" });
    partialMount.append(floatingRoot);
    root.append(partialMount);
    body.append(root);

    const feature = new runtime.ScreensaverFeature();
    feature.target = root;
    feature.partialLoaded = true;
    feature.ownsSingleton = true;
    runtime.screensaverActiveSignal.value = true;

    feature.destroy();

    assert.equal(root.querySelector("[data-screensaver-partial]"), null, "destroy should remove injected screensaver partial markup");
    assert.equal(runtime.screensaverActiveSignal.value, false, "destroy should clear the shared screensaver state");
  } finally {
    runtime.screensaverActiveSignal.value = false;
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

function testPortfolioStageSingletonKeyboardBinding(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const firstRoot = createPortfolioStageRoot();
  const secondRoot = createPortfolioStageRoot();
  body.append(firstRoot);
  body.append(secondRoot);

  runtime.screensaverActiveSignal.value = false;
  const firstFeature = new runtime.PortfolioStageFeature({ stepAnimationMs: 0 });
  const secondFeature = new runtime.PortfolioStageFeature({ stepAnimationMs: 0 });
  firstFeature.mount(firstRoot);
  secondFeature.mount(secondRoot);

  assert.equal((documentListeners.get("keydown") ?? []).length, 1, "only one portfolio stage should bind the global keyboard handler");

  dispatchDocumentEvent("keydown", {
    key: "ArrowRight",
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault() {},
    target: firstRoot,
  });

  assert.equal(firstRoot.querySelector("[data-portfolio-stage-current-title]").textContent, "Velvet Broadcast", "the first portfolio stage should retain global keyboard ownership");
  assert.equal(secondRoot.querySelector("[data-portfolio-stage-current-title]").textContent, "Afterglow Frames", "duplicate portfolio stages must not bind a second global keyboard handler");

  secondFeature.destroy();
  firstFeature.destroy();
  runtime.screensaverActiveSignal.value = false;
  restoreDomGlobals();
}

function testPortfolioStageDestroyRestoresAuthoredDom(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createPortfolioStageRoot();
  body.append(root);

  const feature = new runtime.PortfolioStageFeature({ stepAnimationMs: 0 });
  feature.mount(root);

  dispatchDocumentEvent("keydown", {
    key: "ArrowRight",
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault() {},
    target: root,
  });
  dispatchElementEvent(root.querySelectorAll("[data-portfolio-stage-filter]")[2], "click", {});
  dispatchElementEvent(root.querySelector("[data-portfolio-stage-details-toggle]"), "click", {});

  feature.destroy();

  const items = root.querySelectorAll("[data-portfolio-stage-item]");
  assert.equal(items[0].hidden, false, "destroy should restore the authored visibility of the leading card");
  assert.equal(items[1].hidden, true, "destroy should restore hidden authored cards");
  assert.equal(items[0].getAttribute("data-portfolio-stage-slot"), null, "destroy should remove runtime slot attributes");
  assert.equal(items[0].getAttribute("aria-hidden"), null, "destroy should restore authored aria-hidden state");
  assert.equal(root.querySelector("[data-portfolio-stage-current-title]").textContent, "", "destroy should restore authored text outputs");
  assert.equal(root.querySelector("[data-portfolio-stage-details]").hidden, true, "destroy should restore the authored details visibility");
  assert.equal(root.querySelector("[data-portfolio-stage-details-toggle]").getAttribute("aria-expanded"), null, "destroy should restore details toggle attributes");
  assert.equal(root.querySelectorAll("[data-portfolio-stage-filter]")[2].classList.contains("is-selected"), false, "destroy should restore authored filter button classes");
  assert.equal(root.getAttribute("data-portfolio-stage-filter-value"), null, "destroy should remove runtime root filter state");

  runtime.screensaverActiveSignal.value = false;
  restoreDomGlobals();
}

async function testPortfolioStageWrapEntersFromDestinationSide(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createPortfolioStageRoot();
  body.append(root);

  const feature = new runtime.PortfolioStageFeature({ stepAnimationMs: 0 });
  feature.mount(root);

  dispatchDocumentEvent("keydown", {
    key: "ArrowRight",
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault() {},
    target: root,
  });

  const wrappedItem = root.querySelector('[data-portfolio-stage-title="Chrome Runner"]');
  assert.equal(
    wrappedItem.getAttribute("data-portfolio-stage-wrap-enter"),
    "right",
    "advancing should re-enter the far-left item from the right edge"
  );

  await waitForTimers(1);
  assert.equal(
    wrappedItem.getAttribute("data-portfolio-stage-wrap-enter"),
    null,
    "wrap-enter state should clear after the entry transition is armed"
  );

  feature.destroy();
  runtime.screensaverActiveSignal.value = false;
  restoreDomGlobals();
}

async function testPortfolioStageNavigationAndFiltering(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createPortfolioStageRoot();
  body.append(root);

  const feature = new runtime.PortfolioStageFeature({ stepAnimationMs: 0 });
  feature.mount(root);

  assert.equal(root.querySelectorAll("[data-portfolio-stage-item]").filter((node) => !node.hidden).length, 5, "portfolio stage should show a stack of visible cards");
  assert.equal(root.querySelector('[data-portfolio-stage-slot="0"]').getAttribute("data-portfolio-stage-title"), "Afterglow Frames");
  assert.equal(root.querySelector("[data-portfolio-stage-current-title]").textContent, "Afterglow Frames");
  assert.equal(root.querySelector("[data-portfolio-stage-current-index]").textContent, "01 / 05");

  dispatchDocumentEvent("keydown", {
    key: "ArrowRight",
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    target: root,
  });
  assert.equal(root.querySelector('[data-portfolio-stage-slot="0"]').getAttribute("data-portfolio-stage-title"), "Velvet Broadcast", "ArrowRight should advance the portfolio stage");
  assert.equal(root.querySelector("[data-portfolio-stage-current-title]").textContent, "Velvet Broadcast");

  dispatchElementEvent(root.querySelectorAll("[data-portfolio-stage-filter]")[2], "click", {});
  assert.equal(root.querySelector("[data-portfolio-stage-current-title]").textContent, "Signal Form", "filtering should jump to the first matching item");
  assert.equal(root.querySelector("[data-portfolio-stage-current-index]").textContent, "01 / 02", "filtering should update the visible item count");

  dispatchElementEvent(root.querySelector("[data-portfolio-stage-details-toggle]"), "click", {});
  assert.equal(root.querySelector("[data-portfolio-stage-details]").hidden, false, "details toggle should reveal the details panel");

  dispatchDocumentEvent("keydown", {
    key: "Escape",
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    target: root,
  });
  assert.equal(root.querySelector("[data-portfolio-stage-details]").hidden, true, "Escape should close the details panel");

  runtime.screensaverActiveSignal.value = true;
  dispatchDocumentEvent("keydown", {
    key: "ArrowRight",
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    target: root,
  });
  assert.equal(
    root.querySelector("[data-portfolio-stage-current-title]").textContent,
    "Signal Form",
    "document-wide keyboard navigation should pause while screensaver is active"
  );
  runtime.screensaverActiveSignal.value = false;

  dispatchElementEvent(root.querySelectorAll("[data-portfolio-stage-filter]")[0], "click", {});
  dispatchElementEvent(root.querySelector('[data-portfolio-stage-title="Chrome Runner"]'), "click", {});
  assert.equal(
    root.querySelector("[data-portfolio-stage-current-title]").textContent,
    "Signal Form Two",
    "clicking a farther card should start stepping through the carousel"
  );
  await waitForTimers(2);
  assert.equal(
    root.querySelector("[data-portfolio-stage-current-title]").textContent,
    "Chrome Runner",
    "clicking a visible card should play the carousel to that item"
  );

  feature.destroy();
  restoreDomGlobals();
}

function testPortfolioStageBlankClickUsesLiveRects(runtime) {
  const body = new FakeElement("body");
  installDomGlobals(body);

  const root = createPortfolioStageRoot();
  body.append(root);

  const feature = new runtime.PortfolioStageFeature({ stepAnimationMs: 0 });
  feature.mount(root);

  const stage = root.querySelector("[data-portfolio-stage-stage]");
  setFakeRect(stage, { left: 0, top: 0, width: 600, height: 400 });
  setFakeRect(root.querySelector('[data-portfolio-stage-title="Afterglow Frames"]'), {
    left: 240,
    top: 110,
    width: 120,
    height: 160,
  });
  setFakeRect(root.querySelector('[data-portfolio-stage-title="Velvet Broadcast"]'), {
    left: 80,
    top: 120,
    width: 60,
    height: 100,
  });
  setFakeRect(root.querySelector('[data-portfolio-stage-title="Signal Form"]'), {
    left: 470,
    top: 100,
    width: 70,
    height: 100,
  });
  setFakeRect(root.querySelector('[data-portfolio-stage-title="Chrome Runner"]'), {
    left: 360,
    top: 150,
    width: 70,
    height: 90,
  });
  setFakeRect(root.querySelector('[data-portfolio-stage-title="Signal Form Two"]'), {
    left: 160,
    top: 135,
    width: 60,
    height: 90,
  });

  dispatchElementEvent(stage, "click", {
    target: stage,
    clientX: 70,
    clientY: 170,
  });

  assert.equal(
    root.querySelector("[data-portfolio-stage-current-title]").textContent,
    "Velvet Broadcast",
    "blank-stage click targeting should follow the rendered card boxes"
  );

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

    assert.equal(addCalls, 0, "screensaver-owned floating images should stay paused until the screensaver activates");
    runtime.screensaverActiveSignal.value = true;
    assert.equal(addCalls, 1, "screensaver-owned floating images should subscribe when the screensaver activates");

    runtime.screensaverActiveSignal.value = false;
    assert.equal(unsubscribers[0].calls, 1, "screensaver-owned floating images should unsubscribe when the screensaver hides");
    screensaverFeature.destroy();
  } finally {
    runtime.globalScheduler.add = originalAdd;
    runtime.screensaverActiveSignal.value = false;
    restoreFloatingWindow();
  }
}

async function testFloatingImagesContainerResize(runtime) {
  const floatingWindow = installWindowForFloatingImages();
  runtime.__setWaitForImagesReady(async () => []);
  const originalAdd = runtime.globalScheduler.add.bind(runtime.globalScheduler);
  runtime.globalScheduler.add = () => () => {};

  try {
    const root = createFloatingRoot();
    const feature = new runtime.FloatingImagesFeature();
    await feature.mount(root);

    assert.equal(feature.bounds.width, 320, "floating images should read initial container width on mount");
    assert.equal(feature.bounds.height, 240, "floating images should read initial container height on mount");
    assert.equal(floatingWindow.resizeObservers.length, 1, "floating images should observe container size changes");

    root.clientWidth = 480;
    root.clientHeight = 360;
    floatingWindow.resizeObservers[0].trigger();

    assert.equal(feature.bounds.width, 480, "container-only resize should refresh floating image bounds width");
    assert.equal(feature.bounds.height, 360, "container-only resize should refresh floating image bounds height");

    feature.destroy();
    assert.equal(floatingWindow.resizeObservers[0].disconnectCalls, 1, "destroy should disconnect the resize observer");
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

async function testFloatingImagesRestoreInlineStyles(runtime) {
  installWindowForFloatingImages();
  runtime.__setWaitForImagesReady(async () => []);
  const originalAdd = runtime.globalScheduler.add.bind(runtime.globalScheduler);
  runtime.globalScheduler.add = () => () => {};

  try {
    const root = createFloatingRoot();
    const item = root.querySelector("[data-floating-item]");
    item.style.position = "relative";
    item.style.left = "12px";
    item.style.top = "14px";
    item.style.transform = "scale(1.2)";
    item.style.visibility = "collapse";
    item.style.willChange = "opacity";

    const feature = new runtime.FloatingImagesFeature();
    await feature.mount(root);
    feature.destroy();

    assert.equal(item.style.position, "relative", "destroy should restore the original inline position");
    assert.equal(item.style.left, "12px", "destroy should restore the original inline left");
    assert.equal(item.style.top, "14px", "destroy should restore the original inline top");
    assert.equal(item.style.transform, "scale(1.2)", "destroy should restore the original inline transform");
    assert.equal(item.style.visibility, "collapse", "destroy should restore the original inline visibility");
    assert.equal(item.style.willChange, "opacity", "destroy should restore the original inline will-change");
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
let originalResizeObserver;

function installWindowForFloatingImages() {
  originalWindow = globalThis.window;
  originalGetComputedStyle = globalThis.getComputedStyle;
  originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  originalResizeObserver = globalThis.ResizeObserver;
  const resizeObservers = [];

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
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      this.disconnectCalls = 0;
      resizeObservers.push(this);
    }

    observe(target) {
      this.target = target;
    }

    disconnect() {
      this.disconnectCalls += 1;
    }

    trigger(entries) {
      const observedTarget = this.target ?? null;
      this.callback(entries ?? (observedTarget ? [{ target: observedTarget }] : []));
    }
  };

  return { resizeObservers };
}

function restoreFloatingWindow() {
  globalThis.window = originalWindow;
  globalThis.getComputedStyle = originalGetComputedStyle;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  globalThis.ResizeObserver = originalResizeObserver;
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

function setFakeRect(node, { left, top, width, height }) {
  node.clientWidth = width;
  node.clientHeight = height;
  node.getBoundingClientRect = () => ({
    width,
    height,
    top,
    left,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  });
}

function createFloatingRoot() {
  const root = new FakeElement("div");
  root.clientWidth = 320;
  root.clientHeight = 240;
  root.append(new FakeElement("div", { "data-floating-item": "true" }, { width: 48, height: 48 }));
  root.append(new FakeElement("div", { "data-floating-item": "true" }, { width: 48, height: 48 }));
  return root;
}

function createSlideshowRoot() {
  const root = new FakeElement("section");
  root.append(new FakeElement("button", { "data-slide-prev": "" }));
  root.append(new FakeElement("button", { "data-slide-next": "" }));
  root.append(new FakeElement("article", { "data-slide": "" }));
  root.append(new FakeElement("article", { "data-slide": "" }, { hidden: true }));
  root.append(new FakeElement("article", { "data-slide": "" }, { hidden: true }));
  return root;
}

function createStartupSequenceRoot({ hidden = false, layoutTarget = null, nestedLayout = false } = {}) {
  const attributes = {
    "data-startup-sequence": "",
    "data-delay": "100",
    "data-intro-delay": "40",
  };

  if (layoutTarget) {
    attributes["data-layout-target"] = layoutTarget;
  }

  const root = new FakeElement("div", attributes, { hidden });
  const splash = new FakeElement("div", { "data-startup-splash": "" });
  const intro = new FakeElement("p", { "data-startup-intro": "" });
  intro.classList.add("is-hidden");

  root.append(splash);
  root.append(intro);

  if (nestedLayout) {
    root.append(new FakeElement("main", { "data-startup-layout": "" }));
  }

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

function createPortfolioStageRoot() {
  const root = new FakeElement("section", { "data-feature": "portfolio-stage" });
  root.append(new FakeElement("button", { "data-portfolio-stage-prev": "" }));
  root.append(new FakeElement("button", { "data-portfolio-stage-next": "" }));
  root.append(new FakeElement("button", { "data-portfolio-stage-details-toggle": "" }));
  root.append(new FakeElement("button", { "data-portfolio-stage-filter": "all" }));
  root.append(new FakeElement("button", { "data-portfolio-stage-filter": "film" }));
  root.append(new FakeElement("button", { "data-portfolio-stage-filter": "branding" }));
  root.append(new FakeElement("p", { "data-portfolio-stage-current-index": "" }));
  root.append(new FakeElement("h2", { "data-portfolio-stage-current-title": "" }));
  root.append(new FakeElement("p", { "data-portfolio-stage-current-category": "" }));
  root.append(new FakeElement("p", { "data-portfolio-stage-current-summary": "" }));
  root.append(new FakeElement("div", { "data-portfolio-stage-details": "" }, { hidden: true }));

  const stage = new FakeElement("div", { "data-portfolio-stage-stage": "" });
  stage.append(
    new FakeElement(
      "figure",
      {
        "data-portfolio-stage-item": "",
        "data-portfolio-stage-title": "Afterglow Frames",
        "data-portfolio-stage-category": "Film",
        "data-portfolio-stage-summary": "A film-led opener.",
      },
      { hidden: false }
    )
  );
  stage.append(
    new FakeElement(
      "figure",
      {
        "data-portfolio-stage-item": "",
        "data-portfolio-stage-title": "Velvet Broadcast",
        "data-portfolio-stage-category": "Fashion, Commercial",
        "data-portfolio-stage-summary": "A fashion-commercial crossover.",
      },
      { hidden: true }
    )
  );
  stage.append(
    new FakeElement(
      "figure",
      {
        "data-portfolio-stage-item": "",
        "data-portfolio-stage-title": "Signal Form",
        "data-portfolio-stage-category": "Branding",
        "data-portfolio-stage-summary": "A branding-led composition.",
      },
      { hidden: true }
    )
  );
  stage.append(
    new FakeElement(
      "figure",
      {
        "data-portfolio-stage-item": "",
        "data-portfolio-stage-title": "Chrome Runner",
        "data-portfolio-stage-category": "Commercial",
        "data-portfolio-stage-summary": "A warm commercial frame.",
      },
      { hidden: true }
    )
  );
  stage.append(
    new FakeElement(
      "figure",
      {
        "data-portfolio-stage-item": "",
        "data-portfolio-stage-title": "Signal Form Two",
        "data-portfolio-stage-category": "Branding",
        "data-portfolio-stage-summary": "A second branding frame.",
      },
      { hidden: true }
    )
  );
  root.append(stage);

  return root;
}

function spy() {
  const fn = () => {
    fn.calls += 1;
  };
  fn.calls = 0;
  return fn;
}

async function flushMicrotasks(count = 1) {
  for (let i = 0; i < count; i += 1) {
    await Promise.resolve();
  }
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

async function waitForTimers(count = 1) {
  for (let i = 0; i < count; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
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

  if (selector.startsWith("#")) {
    return node.getAttribute("id") === selector.slice(1);
  }

  return false;
}

await run();
