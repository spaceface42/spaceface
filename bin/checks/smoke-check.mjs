import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { APP_CONTRACT } from "../../app/contract-data.js";

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
    for (const featureId of route.featureIds) {
      assertContains(html, `data-feature="${featureId}"`, `${route.file} must mount ${featureId} via data-feature`);
    }
    for (const feature of APP_CONTRACT.features) {
      if (!feature.singletonNote) continue;
      const count = countFeatureMounts(html, feature.featureId);
      if (count > 1) {
        failures.push(`${route.file} must mount at most one ${feature.featureId}; found ${count}`);
      }
    }
    for (const hook of getRequiredHooks(route.hooks ?? [])) {
      assertContains(html, stripHookBrackets(hook), `${route.file} must expose ${hook}`);
    }
    for (const navRoute of navRoutes) {
      assertContains(html, `href="./${navRoute.file}"`, `${route.file} must link to ${navRoute.file} in the primary nav`);
      assertContains(html, `data-nav-link="${navRoute.id}"`, `${route.file} must preserve data-nav-link="${navRoute.id}"`);
    }
  }

  for (const partial of APP_CONTRACT.partials) {
    const html = readFileSync(partialFiles.get(partial.id), "utf8");
    for (const featureId of partial.featureIds) {
      assertContains(html, `data-feature="${featureId}"`, `${partial.file} must mount ${featureId} via data-feature`);
    }
    for (const hook of getRequiredHooks(partial.hooks)) {
      assertContains(html, stripHookBrackets(hook), `${partial.file} must expose ${hook}`);
    }
  }

  assertContains(bundle, "FeatureRegistry", "bundle should include FeatureRegistry runtime");
  for (const partialUrl of Object.values(APP_CONTRACT.defaults.screensaverScenePartialUrls ?? {})) {
    assertContains(bundle, partialUrl.replace(/^\.\//, ""), `bundle should reference the screensaver scene partial ${partialUrl}`);
  }
  assertContains(bundle, "app/main.ts", "bundle sourcemap path should reflect the app entrypoint");
  for (const feature of APP_CONTRACT.features) {
    assertContains(bundle, `"${feature.featureId}"`, `bundle should include ${feature.featureId} feature wiring`);
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

function getRequiredHooks(hooks) {
  return hooks.filter((hook) => hook.presence === "required").map((hook) => hook.selector);
}

function countFeatureMounts(html, featureId) {
  const attrPattern = /\bdata-feature\s*=\s*(["'])([^"']+)\1/gi;
  let count = 0;
  let match;
  while ((match = attrPattern.exec(html)) !== null) {
    const featureIds = match[2].trim().split(/\s+/).filter(Boolean);
    count += featureIds.filter((id) => id === featureId).length;
  }
  return count;
}
