import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const files = {
  index: resolve(root, "docs/index.html"),
  floatingImages: resolve(root, "docs/floatingimages.html"),
  screensaverPartial: resolve(root, "docs/resources/features/screensaver/index.html"),
  slideplayer: resolve(root, "docs/slideplayer.html"),
  bundle: resolve(root, "docs/dist/main.js"),
};

const failures = [];

for (const [name, filePath] of Object.entries(files)) {
  if (!existsSync(filePath)) {
    failures.push(`Missing required file: ${name} -> ${filePath}`);
  }
}

if (failures.length === 0) {
  const indexHtml = readFileSync(files.index, "utf8");
  const floatingImagesHtml = readFileSync(files.floatingImages, "utf8");
  const partialHtml = readFileSync(files.screensaverPartial, "utf8");
  const slideplayerHtml = readFileSync(files.slideplayer, "utf8");
  const bundle = readFileSync(files.bundle, "utf8");
  const bundleSize = statSync(files.bundle).size;

  assertContains(indexHtml, 'data-feature="slideshow"', "index must mount slideshow via data-feature");
  assertContains(indexHtml, 'data-feature="screensaver"', "index must mount screensaver via data-feature");
  assertContains(indexHtml, 'data-feature="floating-images"', "index must mount floating-images via data-feature");
  assertContainsEither(indexHtml, ['src="/dist/main.js"', 'src="./dist/main.js"'], "index must load the vNext bundle");
  assertContains(indexHtml, "spaceface demo", "index should preserve the legacy demo title");

  assertContains(floatingImagesHtml, 'data-feature="floating-images"', "floatingimages page must mount floating-images via data-feature");
  assertContains(floatingImagesHtml, 'data-feature="screensaver"', "floatingimages page must mount screensaver via data-feature");
  assertContains(slideplayerHtml, 'data-feature="slideplayer"', "slideplayer page must mount slideplayer via data-feature");
  assertContains(slideplayerHtml, 'data-slideplayer-stage', "slideplayer page must expose slideplayer stage markup");
  assertContains(slideplayerHtml, 'data-slideplayer-bullets', "slideplayer page must expose slideplayer bullet markup");
  assertContains(slideplayerHtml, 'data-slideplayer-prev', "slideplayer page must expose slideplayer prev control");
  assertContains(slideplayerHtml, 'data-slideplayer-next', "slideplayer page must expose slideplayer next control");
  assertContains(slideplayerHtml, 'data-slideplayer-slide', "slideplayer page must expose slideplayer slide items");

  assertContains(partialHtml, 'data-feature="floating-images"', "screensaver partial must mount floating-images via data-feature");
  assertContains(partialHtml, "data-floating-item", "screensaver partial must define floating items");
  assertContains(partialHtml, 'class="screensaver-floating"', "screensaver partial must use the current screensaver floating markup");

  assertContains(bundle, "FeatureRegistry", "bundle should include FeatureRegistry runtime");
  assertContains(bundle, "resources/features/screensaver/index.html", "bundle should reference the screensaver partial");
  assertContains(bundle, "src/app/main.ts", "bundle sourcemap path should reflect the app entrypoint");
  assertContains(bundle, '"screensaver"', "bundle should include screensaver feature wiring");
  assertContains(bundle, '"slideshow"', "bundle should include slideshow feature wiring");
  assertContains(bundle, '"slideplayer"', "bundle should include slideplayer feature wiring");
  assertContains(bundle, '"floating-images"', "bundle should include floating-images feature wiring");

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

function assertContainsEither(content, needles, message) {
  for (const needle of needles) {
    if (content.includes(needle)) {
      return;
    }
  }
  failures.push(message);
}
