import {
  type FeatureDefinition,
  ScreensaverFeature,
  SlideshowFeature,
} from "../../../src/spaceface.js";
import { APP_CONTRACT, getFeatureContract } from "./contract.js";

export function createRuntimeFeatureDefinitions(): FeatureDefinition[] {
  return [
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
  ];
}
