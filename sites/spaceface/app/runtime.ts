import {
  type FeatureDefinition,
  FloatingImagesFeature,
  ScreensaverFeature,
  SlidePlayerFeature,
  SlideshowFeature,
} from "../../../src/spaceface.js";
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
          partialAssetAttributes: APP_CONTRACT.partialAssetAttributes,
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
