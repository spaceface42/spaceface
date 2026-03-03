import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const files = {
  index: resolve(root, 'docs/demo/index.html'),
  page2: resolve(root, 'docs/demo/page2.html'),
  bundle: resolve(root, 'docs/dist/main.js'),
};

const failures = [];

for (const [name, path] of Object.entries(files)) {
  if (!existsSync(path)) {
    failures.push(`Missing required file: ${name} -> ${path}`);
  }
}

if (failures.length === 0) {
  const indexHtml = readFileSync(files.index, 'utf8');
  const page2Html = readFileSync(files.page2, 'utf8');
  const bundle = readFileSync(files.bundle, 'utf8');
  const bundleSize = statSync(files.bundle).size;

  // Core route-swap fixture checks
  assertContains(indexHtml, 'data-route-container', 'index must define route container');
  assertContains(page2Html, 'data-route-container', 'page2 must define route container');
  assertContains(indexHtml, 'href="./page2.html"', 'index must link to page2');
  assertContains(page2Html, 'href="./index.html"', 'page2 must link back to index');

  // Feature activation/deactivation fixture checks
  assertContains(indexHtml, 'data-slideshow', 'index should include slideshow fixture');
  assertContains(indexHtml, 'data-floating-images', 'index should include floating-images fixture');
  assertNotContains(page2Html, 'data-slideshow', 'page2 should not include slideshow fixture');
  assertNotContains(page2Html, 'data-floating-images', 'page2 should not include floating-images fixture');

  // Runtime behavior anchor checks in built bundle
  assertContains(bundle, 'screensaver:shown', 'bundle should contain screensaver shown event wiring');
  assertContains(bundle, 'screensaver:hidden', 'bundle should contain screensaver hidden event wiring');
  assertContains(bundle, 'AnimationScheduler', 'bundle should include animation scheduler');
  assertContains(bundle, 'dataset.router', 'bundle should include router opt-out support');

  if (bundleSize <= 0) {
    failures.push('bundle size must be > 0');
  }
}

if (failures.length > 0) {
  console.error('[docs smoke] FAILED');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('[docs smoke] OK');

function assertContains(content, needle, message) {
  if (!content.includes(needle)) {
    failures.push(message);
  }
}

function assertNotContains(content, needle, message) {
  if (content.includes(needle)) {
    failures.push(message);
  }
}
