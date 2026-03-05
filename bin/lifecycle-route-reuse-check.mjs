import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { build } from "esbuild";

const root = process.cwd();
const tempDir = mkdtempSync(join(tmpdir(), "spaceface-lifecycle-"));
const bundlePath = join(tempDir, "lifecycle-harness.mjs");

try {
  await build({
    stdin: {
      contents: `
        export { StartupPipeline } from "./src/core/startup.ts";
        export { rebindOnRoute } from "./src/core/rebindOnRoute.ts";
      `,
      loader: "ts",
      resolveDir: root,
      sourcefile: "lifecycle-harness.ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: bundlePath,
    logLevel: "silent",
  });

  const runtime = await import(pathToFileURL(bundlePath).href);
  const { StartupPipeline, rebindOnRoute } = runtime;

  if (!globalThis.window) {
    globalThis.window = { location: { pathname: "/index.html" } };
  } else if (!globalThis.window.location) {
    globalThis.window.location = { pathname: "/index.html" };
  }

  await testStartupReusesFeatureInstance(StartupPipeline);
  testRebindPolicyPreventsStaleActiveState(rebindOnRoute);

  console.log("[lifecycle route-reuse] OK");
} catch (error) {
  console.error("[lifecycle route-reuse] FAILED");
  console.error(error);
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

async function testStartupReusesFeatureInstance(StartupPipeline) {
  let routeChangeCalls = 0;
  const feature = {
    name: "fixture",
    domBound: true,
    init() {},
    onRouteChange() {
      routeChangeCalls += 1;
    },
  };

  const pipeline = new StartupPipeline({
    mode: "dev",
    logLevel: "debug",
    screensaverIdleMs: 1000,
  });

  await pipeline.init([feature]);
  await pipeline.reconcileFeatures([feature], "/page-two");

  assert.equal(routeChangeCalls, 1, "same feature instance should run onRouteChange once on route reconcile");
}

function testRebindPolicyPreventsStaleActiveState(rebindOnRoute) {
  const nodeA = { id: "a" };
  const nodeB = { id: "b" };
  let nextBinding = nodeA;
  let currentBinding = null;
  let activeResources = 0;
  const calls = [];

  const onInit = () => {
    activeResources += 1;
    calls.push("init");
  };
  const onDestroy = () => {
    activeResources = Math.max(0, activeResources - 1);
    calls.push("destroy");
  };

  currentBinding = rebindOnRoute({
    getNextBinding: () => nextBinding,
    currentBinding,
    hasActiveState: activeResources > 0,
    onInit,
    onDestroy,
  });
  assert.equal(activeResources, 1, "initial bind should create one active resource");

  nextBinding = nodeB;
  currentBinding = rebindOnRoute({
    getNextBinding: () => nextBinding,
    currentBinding,
    hasActiveState: activeResources > 0,
    onInit,
    onDestroy,
  });
  assert.deepEqual(calls, ["init", "destroy", "init"], "binding swap should destroy old state before re-init");
  assert.equal(activeResources, 1, "swap must not leak parallel active resources");
  assert.equal(currentBinding, nodeB, "binding should update to the new route node");

  currentBinding = rebindOnRoute({
    getNextBinding: () => nextBinding,
    currentBinding,
    hasActiveState: activeResources > 0,
    onInit,
    onDestroy,
  });
  assert.equal(activeResources, 1, "same binding should keep exactly one active resource");

  nextBinding = null;
  currentBinding = rebindOnRoute({
    getNextBinding: () => nextBinding,
    currentBinding,
    hasActiveState: activeResources > 0,
    onInit,
    onDestroy,
  });
  assert.equal(currentBinding, null, "missing binding should clear current binding");
  assert.equal(activeResources, 0, "missing binding should fully tear down active resources");
}
