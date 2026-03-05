import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const files = {
  index: resolve(root, 'docs/index.html'),
  slideplayer: resolve(root, 'docs/slideplayer.html'),
  floatingimages: resolve(root, 'docs/floatingimages.html'),
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
  const slideplayerHtml = readFileSync(files.slideplayer, 'utf8');
  const floatingImagesHtml = readFileSync(files.floatingimages, 'utf8');
  const bundle = readFileSync(files.bundle, 'utf8');
  const bundleSize = statSync(files.bundle).size;
  const indexMainHtml = extractMainBlock(indexHtml);
  const slideplayerMainHtml = extractMainBlock(slideplayerHtml);
  const floatingImagesMainHtml = extractMainBlock(floatingImagesHtml);

  // Core route-swap fixture checks
  assertContains(indexHtml, 'data-route-container', 'index must define route container');
  assertContains(slideplayerHtml, 'data-route-container', 'slideplayer must define route container');
  assertContains(indexHtml, 'href="./slideplayer.html"', 'index must link to slideplayer');
  assertContains(indexHtml, 'href="./floatingimages.html"', 'index must link to floatingimages');
  assertContains(slideplayerHtml, 'href="./index.html"', 'slideplayer must link back to index');
  assertContains(floatingImagesHtml, 'href="./index.html"', 'floatingimages must link back to index');

  // Feature activation/deactivation fixture checks
  assertContains(indexMainHtml, 'data-slideshow', 'index should include slideshow fixture');
  assertContains(indexMainHtml, 'data-floating-images', 'index should include floating-images fixture');
  assertNotContains(slideplayerMainHtml, 'data-slideshow', 'slideplayer should not include slideshow fixture');
  assertNotContains(slideplayerMainHtml, 'data-floating-images', 'slideplayer should not include floating-images fixture');
  assertNotContains(floatingImagesMainHtml, 'data-slideshow', 'floatingimages should not include slideshow fixture');
  assertContains(floatingImagesMainHtml, 'data-floating-images', 'floatingimages should include floating-images fixture');

  // Runtime behavior anchor checks in built bundle
  assertContains(bundle, 'screensaver:shown', 'bundle should contain screensaver shown event wiring');
  assertContains(bundle, 'screensaver:hidden', 'bundle should contain screensaver hidden event wiring');
  assertContains(bundle, 'AnimationScheduler', 'bundle should include animation scheduler');
  assertContains(bundle, 'dataset.router', 'bundle should include router opt-out support');
  assertContains(bundle, 'isCurrentNavigation', 'bundle should include stale-navigation guard hook context');
  assertContains(bundle, 'reconcileInFlight', 'bundle should include serialized route reconcile guard');

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

function extractMainBlock(html) {
  const match = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i);
  return match ? match[0] : html;
}
