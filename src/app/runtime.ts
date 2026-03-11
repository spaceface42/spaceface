import type { FeatureDefinition } from "../core/feature.js";
import { FloatingImagesFeature } from "../features/floating-images/FloatingImagesFeature.js";
import { ScreensaverFeature } from "../features/screensaver/ScreensaverFeature.js";
import { SlidePlayerFeature } from "../features/slideplayer/SlidePlayerFeature.js";
import { SlideshowFeature } from "../features/slideshow/SlideshowFeature.js";
import { APP_CONTRACT, getFeatureContract } from "./contract.js";

export function createRuntimeFeatureDefinitions(): FeatureDefinition[] {
  return [
    {
      selector: getFeatureContract("floating-images").selector,
      create: () => new FloatingImagesFeature(),
    },
    {
      selector: getFeatureContract("screensaver").selector,
      create: () =>
        new ScreensaverFeature({
          idleMs: APP_CONTRACT.defaults.screensaverIdleMs,
          partialUrl: APP_CONTRACT.defaults.screensaverPartialUrl,
        }),
    },
    {
      selector: getFeatureContract("slideshow").selector,
      create: () =>
        new SlideshowFeature({
          autoplayMs: APP_CONTRACT.defaults.slideshowAutoplayMs,
        }),
    },
    {
      selector: getFeatureContract("slideplayer").selector,
      create: () =>
        new SlidePlayerFeature({
          autoplayMs: APP_CONTRACT.defaults.slideshowAutoplayMs,
        }),
    },
  ];
}
