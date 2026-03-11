export const APP_CONTRACT = {
  name: "Starter Site",
  sourceDir: "sites/starter/public",
  outputDir: "docs",
  defaults: {
    screensaverIdleMs: 8000,
    slideshowAutoplayMs: 4000,
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
      featureSelectors: ["slideshow", "screensaver"],
      requiredHooks: [],
    },
  ],
  partials: [
    {
      id: "screensaver",
      file: "resources/features/screensaver/index.html",
      hostHook: "[data-screensaver-partial]",
      featureSelectors: ["slideshow"],
      requiredHooks: ["[data-slide]"],
    },
  ],
};
