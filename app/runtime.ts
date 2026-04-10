import {
  type FeatureDefinition,
} from "../src/spaceface.js";
import {
  FloatingImagesFeature,
  PortfolioStageFeature,
  SlidePlayerFeature,
  SlideshowFeature,
} from "../src/editorial.js";
import {
  AttractorSceneFeature,
  ScreensaverFeature,
} from "../src/screensaver.js";
import { APP_CONTRACT, getFeatureContract } from "./contract.js";

export function createRuntimeFeatureDefinitions(): FeatureDefinition[] {
  return [
    {
      featureId: getFeatureContract("floating-images").featureId,
      create: () => new FloatingImagesFeature(),
    },
    {
      featureId: getFeatureContract("attractor-scene").featureId,
      create: () =>
        new AttractorSceneFeature({
          rotateMs: APP_CONTRACT.defaults.attractorSceneRotateMs,
        }),
    },
    {
      featureId: getFeatureContract("screensaver").featureId,
      create: () =>
        new ScreensaverFeature({
          idleMs: APP_CONTRACT.defaults.screensaverIdleMs,
          defaultScene: APP_CONTRACT.defaults.screensaverDefaultScene,
          scenePartialUrls: APP_CONTRACT.defaults.screensaverScenePartialUrls,
          partialAssetAttributes: APP_CONTRACT.partialAssetAttributes,
        }),
    },
    {
      featureId: getFeatureContract("portfolio-stage").featureId,
      create: () => new PortfolioStageFeature(),
    },
    {
      featureId: getFeatureContract("slideshow").featureId,
      create: () =>
        new SlideshowFeature({
          autoplayMs: APP_CONTRACT.defaults.slideshowAutoplayMs,
        }),
    },
    {
      featureId: getFeatureContract("slideplayer").featureId,
      create: () =>
        new SlidePlayerFeature({
          autoplayMs: APP_CONTRACT.defaults.slideshowAutoplayMs,
        }),
    },
  ];
}
