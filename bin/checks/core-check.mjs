import assert from "node:assert/strict";
import { runBundledCheck } from "./lib/run-bundled-check.mjs";

await runBundledCheck(
  {
    label: "core",
    tempPrefix: "spaceface-core-check-",
    bundleFile: "core-check-harness.mjs",
    sourcefile: "core-check-harness.ts",
    contents: `
      export { createSignal, createEffect } from "./src/core/signals.ts";
      export { FrameScheduler } from "./src/core/scheduler.ts";
      export { createLogger, subscribeLogs } from "./src/core/logger.ts";
      export { clamp, distance, randomBetween, gaussianRandom } from "./src/core/utils/math-utils.ts";
    `,
  },
  (runtime) => {
    testSignalRecovery(runtime.createSignal, runtime.createEffect);
    testSchedulerIsolation(runtime.FrameScheduler);
    testLoggerSubscriptions(runtime.createLogger, runtime.subscribeLogs);
    testMathUtils(runtime);
  }
);

function testSignalRecovery(createSignal, createEffect) {
  const signalA = createSignal(0);
  const signalB = createSignal(0);

  try {
    createEffect(() => {
      signalA.value;
      throw new Error("boom");
    });
    assert.fail("throwing effect should propagate");
  } catch (error) {
    assert.equal(error.message, "boom");
  }

  let runs = 0;
  createEffect(() => {
    signalB.value;
    runs += 1;
  });

  void signalA.value;
  signalB.value = 1;
  assert.equal(runs, 2, "subsequent effects should work after a thrown effect");

  signalA.value = 1;
  assert.equal(runs, 2, "plain signal reads must not attach stale subscribers");
}

function testSchedulerIsolation(FrameScheduler) {
  const originalWindow = globalThis.window;
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;

  const frameQueue = [];
  const surfacedErrors = [];

  globalThis.window = {
    setTimeout: (fn) => {
      surfacedErrors.push(fn);
      return surfacedErrors.length;
    },
  };
  globalThis.requestAnimationFrame = (cb) => {
    frameQueue.push(cb);
    return frameQueue.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  try {
    const scheduler = new FrameScheduler();
    let healthyUpdates = 0;
    let healthyRenders = 0;

    scheduler.add({
      update() {
        throw new Error("scheduler task failed");
      },
    });
    scheduler.add({
      update() {
        healthyUpdates += 1;
      },
      render() {
        healthyRenders += 1;
      },
    });

    assert.equal(frameQueue.length, 1, "scheduler should request an animation frame when the first task is added");
    const frameOne = frameQueue.shift();
    frameOne(16);

    assert.equal(healthyUpdates, 1, "healthy task update should still run when another task fails");
    assert.equal(healthyRenders, 1, "healthy task render should still run when another task fails");
    assert.equal(frameQueue.length, 1, "scheduler should continue scheduling frames after isolating a bad task");
    assert.equal(surfacedErrors.length, 1, "scheduler should surface the isolated task error");

    const frameTwo = frameQueue.shift();
    frameTwo(32);

    assert.equal(healthyUpdates, 2, "healthy task should continue running on subsequent frames");
    assert.equal(healthyRenders, 2, "healthy task render should continue running on subsequent frames");

    assert.throws(() => {
      surfacedErrors[0]();
    }, /scheduler task failed/);
  } finally {
    globalThis.window = originalWindow;
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancelRaf;
  }
}

function testLoggerSubscriptions(createLogger, subscribeLogs) {
  const logger = createLogger("test", "debug");
  const anyEntries = [];
  const childEntries = [];

  const detachAny = subscribeLogs("any", (entry) => {
    anyEntries.push(entry);
  });
  const detachChild = subscribeLogs("test:child", (entry) => {
    childEntries.push(entry);
  });

  logger.debug("boot");
  logger.child("child").info("nested");

  detachAny();
  detachChild();

  assert.equal(anyEntries.length, 2, '"any" listener should receive every emitted log entry');
  assert.equal(childEntries.length, 1, "scope listener should receive matching child-scope entries");
  assert.equal(childEntries[0].scope, "test:child");
  assert.equal(childEntries[0].message, "nested");
}

function testMathUtils({ clamp, distance, randomBetween, gaussianRandom }) {
  assert.equal(clamp(-5, 0, 10), 0, "clamp should floor values below the minimum");
  assert.equal(clamp(4, 0, 10), 4, "clamp should preserve in-range values");
  assert.equal(clamp(15, 0, 10), 10, "clamp should cap values above the maximum");

  assert.equal(distance(0, 0, 3, 4), 5, "distance should return Euclidean distance");
  assert.equal(distance(2, -1, 2, -1), 0, "distance should be zero for identical points");

  withStubbedRandom([0], () => {
    assert.equal(randomBetween(10, 20), 10, "randomBetween should return the minimum when Math.random() is 0");
  });
  withStubbedRandom([0.75], () => {
    assert.equal(randomBetween(10, 20), 17.5, "randomBetween should scale the random sample across the range");
  });
  withStubbedRandom([0, 0.5, 0, 0.5], () => {
    const expected = -Math.sqrt(-2 * Math.log(0.5));
    assertClose(
      gaussianRandom(),
      expected,
      "gaussianRandom should retry zero inputs and apply the Box-Muller transform",
    );
  });
}

function withStubbedRandom(values, callback) {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => {
    const value = values[index];
    if (value === undefined) {
      throw new Error("Math.random exhausted");
    }
    index += 1;
    return value;
  };

  try {
    callback();
  } finally {
    Math.random = originalRandom;
  }
}

function assertClose(actual, expected, message, epsilon = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${message} (expected ${expected}, received ${actual})`);
}
