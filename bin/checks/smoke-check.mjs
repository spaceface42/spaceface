import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { APP_CONTRACT } from "../../sites/spaceface/app/contract-data.js";

const root = process.cwd();
const bundlePath = resolve(root, APP_CONTRACT.outputDir, "bin/app.js");
const routeFiles = new Map(APP_CONTRACT.routes.map((route) => [route.id, resolve(root, APP_CONTRACT.outputDir, route.file)]));
const partialFiles = new Map(APP_CONTRACT.partials.map((partial) => [partial.id, resolve(root, APP_CONTRACT.outputDir, partial.file)]));
const failures = [];

for (const [routeId, filePath] of routeFiles) {
  if (!existsSync(filePath)) {
    failures.push(`Missing required route: ${routeId} -> ${filePath}`);
  }
}

for (const [partialId, filePath] of partialFiles) {
  if (!existsSync(filePath)) {
    failures.push(`Missing required partial: ${partialId} -> ${filePath}`);
  }
}

if (!existsSync(bundlePath)) {
  failures.push(`Missing required bundle: ${bundlePath}`);
}

if (failures.length === 0) {
  const bundle = readFileSync(bundlePath, "utf8");
  const bundleSize = statSync(bundlePath).size;
  const navRoutes = APP_CONTRACT.routes.filter((route) => route.navLabel);

  for (const route of APP_CONTRACT.routes) {
    const html = readFileSync(routeFiles.get(route.id), "utf8");
    assertContains(html, `data-page="${route.page}"`, `${route.file} must declare body[data-page="${route.page}"]`);
    for (const selector of route.featureSelectors) {
      assertContains(html, `data-feature="${selector}"`, `${route.file} must mount ${selector} via data-feature`);
    }
    for (const hook of route.requiredHooks ?? []) {
      assertContains(html, stripHookBrackets(hook), `${route.file} must expose ${hook}`);
    }
    for (const navRoute of navRoutes) {
      assertContains(html, `href="./${navRoute.file}"`, `${route.file} must link to ${navRoute.file} in the primary nav`);
      assertContains(html, `data-nav-link="${navRoute.id}"`, `${route.file} must preserve data-nav-link="${navRoute.id}"`);
    }
  }

  for (const partial of APP_CONTRACT.partials) {
    const html = readFileSync(partialFiles.get(partial.id), "utf8");
    for (const selector of partial.featureSelectors) {
      assertContains(html, `data-feature="${selector}"`, `${partial.file} must mount ${selector} via data-feature`);
    }
    for (const hook of partial.requiredHooks) {
      assertContains(html, stripHookBrackets(hook), `${partial.file} must expose ${hook}`);
    }
  }

  assertContains(bundle, "FeatureRegistry", "bundle should include FeatureRegistry runtime");
  assertContains(bundle, APP_CONTRACT.defaults.screensaverPartialUrl.replace(/^\.\//, ""), "bundle should reference the screensaver partial");
  assertContains(bundle, "sites/spaceface/app/main.ts", "bundle sourcemap path should reflect the app entrypoint");
  for (const feature of APP_CONTRACT.features) {
    assertContains(bundle, `"${feature.selector}"`, `bundle should include ${feature.selector} feature wiring`);
  }

  if (bundleSize <= 0) {
    failures.push("bundle size must be > 0");
  }
}

if (failures.length > 0) {
  console.error("[docs smoke] FAILED");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[docs smoke] OK");

function assertContains(content, needle, message) {
  if (!content.includes(needle)) {
    failures.push(message);
  }
}

function stripHookBrackets(hook) {
  if (hook.startsWith("[") && hook.endsWith("]")) {
    return hook.slice(1, -1);
  }
  return hook;
}
