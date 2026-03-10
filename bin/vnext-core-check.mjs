import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const tempDir = mkdtempSync(join(tmpdir(), "spaceface-vnext-core-"));
const bundlePath = join(tempDir, "vnext-core-harness.mjs");

try {
  await build({
    stdin: {
      contents: `
        export { createSignal, createEffect } from "./src/core/signals.ts";
        export { FrameScheduler } from "./src/core/scheduler.ts";
      `,
      loader: "ts",
      resolveDir: process.cwd(),
      sourcefile: "vnext-core-harness.ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: bundlePath,
    logLevel: "silent",
  });

  const runtime = await import(pathToFileURL(bundlePath).href);
  testSignalRecovery(runtime.createSignal, runtime.createEffect);
  testSchedulerIsolation(runtime.FrameScheduler);
  console.log("[vnext core] OK");
} catch (error) {
  console.error("[vnext core] FAILED");
  console.error(error);
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

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
