import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runBundledCheck } from "./lib/run-bundled-check.mjs";

const root = process.cwd();
const distFiles = [
  "dist/spaceface.js",
  "dist/spaceface.d.ts",
  "dist/editorial.js",
  "dist/editorial.d.ts",
  "dist/screensaver.js",
  "dist/screensaver.d.ts",
];

for (const relativePath of distFiles) {
  const absolutePath = resolve(root, relativePath);
  assert.ok(existsSync(absolutePath), `Missing required package artifact: ${relativePath}`);
}

runTypeScriptConsumerCheck();

await runBundledCheck(
  {
    label: "package-compat",
    tempPrefix: "spaceface-package-compat-",
    bundleFile: "package-compat-harness.mjs",
    sourcefile: "package-compat-harness.ts",
    contents: `
      export { FeatureRegistry, createSignal, featurePauseSignal } from "spaceface";
      export { SlideshowFeature, SlidePlayerFeature, FloatingImagesFeature, PortfolioStageFeature } from "spaceface/editorial";
      export { ScreensaverFeature, AttractorSceneFeature, screensaverActiveSignal } from "spaceface/screensaver";
    `,
  },
  async (runtime) => {
    assert.equal(typeof runtime.FeatureRegistry, "function", "core package entry should export FeatureRegistry");
    assert.equal(typeof runtime.createSignal, "function", "core package entry should export createSignal");
    assert.equal(typeof runtime.featurePauseSignal, "object", "core package entry should export featurePauseSignal");

    assert.equal(typeof runtime.SlideshowFeature, "function", "editorial package entry should export SlideshowFeature");
    assert.equal(typeof runtime.SlidePlayerFeature, "function", "editorial package entry should export SlidePlayerFeature");
    assert.equal(typeof runtime.FloatingImagesFeature, "function", "editorial package entry should export FloatingImagesFeature");
    assert.equal(typeof runtime.PortfolioStageFeature, "function", "editorial package entry should export PortfolioStageFeature");

    assert.equal(typeof runtime.ScreensaverFeature, "function", "screensaver package entry should export ScreensaverFeature");
    assert.equal(typeof runtime.AttractorSceneFeature, "function", "screensaver package entry should export AttractorSceneFeature");
    assert.equal(typeof runtime.screensaverActiveSignal, "object", "screensaver package entry should export screensaverActiveSignal");
  }
);

function runTypeScriptConsumerCheck() {
  const tempDir = mkdtempSync(join(root, ".package-compat-check-"));
  const tsconfigPath = join(tempDir, "tsconfig.json");
  const sourcePath = join(tempDir, "consumer.ts");

  try {
    writeFileSync(
      tsconfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            module: "NodeNext",
            moduleResolution: "NodeNext",
            target: "ES2022",
            strict: true,
            noEmit: true,
            lib: ["ES2022", "DOM"],
          },
          include: ["./consumer.ts"],
        },
        null,
        2
      ),
      "utf8"
    );

    writeFileSync(
      sourcePath,
      `
        import {
          FeatureRegistry,
          createSignal,
          featurePauseSignal,
          type Feature,
          type FeatureDefinition,
        } from "spaceface";
        import {
          FloatingImagesFeature,
          PortfolioStageFeature,
          SlidePlayerFeature,
          SlideshowFeature,
        } from "spaceface/editorial";
        import {
          AttractorSceneFeature,
          ScreensaverFeature,
          screensaverActiveSignal,
        } from "spaceface/screensaver";

        const count = createSignal(0);
        const registry = new FeatureRegistry();
        const definition: FeatureDefinition = {
          featureId: "example-feature",
          create(): Feature {
            return {};
          },
        };

        registry.register(definition);

        const editorialFeatures = [
          new FloatingImagesFeature(),
          new PortfolioStageFeature(),
          new SlidePlayerFeature(),
          new SlideshowFeature(),
        ];
        const screensaverFeatures = [
          new AttractorSceneFeature(),
          new ScreensaverFeature(),
        ];

        void count.value;
        void featurePauseSignal.value;
        void screensaverActiveSignal.value;
        void editorialFeatures;
        void screensaverFeatures;
      `,
      "utf8"
    );

    execFileSync(
      process.execPath,
      [resolve(root, "node_modules/typescript/lib/tsc.js"), "--project", tsconfigPath, "--pretty", "false"],
      {
        cwd: root,
        stdio: "pipe",
      }
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
