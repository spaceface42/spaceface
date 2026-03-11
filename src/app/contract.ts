import type { LogLevel } from "../core/logger.js";

export interface FeatureContract {
  id: string;
  selector: string;
  root: string;
  internals: string[];
  singletonNote?: string;
}

export interface RouteContract {
  id: string;
  file: string;
  page: string;
  navLabel?: string;
  featureSelectors: string[];
  requiredHooks?: string[];
}

export interface PartialContract {
  id: string;
  file: string;
  hostHook: string;
  featureSelectors: string[];
  requiredHooks: string[];
}

export interface AppContract {
  name: string;
  sourceDir: string;
  outputDir: string;
  defaults: {
    screensaverIdleMs: number;
    slideshowAutoplayMs: number;
    screensaverPartialUrl: string;
  };
  pageHooks: string[];
  activityInputs: string[];
  partialAssetAttributes: string[];
  features: FeatureContract[];
  routes: RouteContract[];
  partials: PartialContract[];
}

export const APP_CONTRACT: AppContract = {
  name: "Spaceface",
  sourceDir: "docs.src",
  outputDir: "docs",
  defaults: {
    screensaverIdleMs: 6000,
    slideshowAutoplayMs: 5000,
    screensaverPartialUrl: "./resources/features/screensaver/index.html",
  },
  pageHooks: ["html[data-mode]", "body[data-page]", "[data-nav-link]"],
  activityInputs: ["mousemove", "wheel", "keydown", "pointerdown", "visibilitychange"],
  partialAssetAttributes: ["src", "poster", "data-src"],
  features: [
    {
      id: "slideshow",
      selector: "slideshow",
      root: 'data-feature="slideshow"',
      internals: ["[data-slide]", "[data-slide-prev]", "[data-slide-next]"],
    },
    {
      id: "slideplayer",
      selector: "slideplayer",
      root: 'data-feature="slideplayer"',
      internals: [
        "[data-slideplayer-stage]",
        "[data-slideplayer-slide]",
        "[data-slideplayer-prev]",
        "[data-slideplayer-next]",
        "[data-slideplayer-bullets]",
        "[data-slideplayer-bullet]",
      ],
      singletonNote: "One slideplayer per page is the intended authored pattern.",
    },
    {
      id: "floating-images",
      selector: "floating-images",
      root: 'data-feature="floating-images"',
      internals: ["[data-floating-item]"],
    },
    {
      id: "screensaver",
      selector: "screensaver",
      root: 'data-feature="screensaver"',
      internals: ["[data-screensaver]", "[data-screensaver-partial]"],
    },
  ],
  routes: [
    {
      id: "index",
      file: "index.html",
      page: "index",
      navLabel: "Home",
      featureSelectors: ["slideshow", "floating-images", "screensaver"],
      requiredHooks: [],
    },
    {
      id: "slideplayer",
      file: "slideplayer.html",
      page: "slideplayer",
      navLabel: "Slideplayer",
      featureSelectors: ["slideplayer", "screensaver"],
      requiredHooks: [
        "[data-slideplayer-stage]",
        "[data-slideplayer-bullets]",
        "[data-slideplayer-prev]",
        "[data-slideplayer-next]",
        "[data-slideplayer-slide]",
      ],
    },
    {
      id: "floatingimages",
      file: "floatingimages.html",
      page: "floatingimages",
      navLabel: "Floating images",
      featureSelectors: ["floating-images", "screensaver"],
      requiredHooks: [],
    },
  ],
  partials: [
    {
      id: "screensaver",
      file: "resources/features/screensaver/index.html",
      hostHook: "[data-screensaver-partial]",
      featureSelectors: ["floating-images"],
      requiredHooks: ["[data-floating-item]", 'class="screensaver-floating"'],
    },
  ],
};

export function getDocumentMode(documentMode = document.documentElement?.dataset.mode): string {
  return documentMode ?? "prod";
}

export function getDefaultLogLevel(documentMode: string): LogLevel {
  return documentMode === "dev" ? "debug" : "warn";
}

export function getFeatureContract(featureId: string): FeatureContract {
  const feature = APP_CONTRACT.features.find((entry) => entry.id === featureId);
  if (!feature) {
    throw new Error(`Unknown feature contract: ${featureId}`);
  }
  return feature;
}
