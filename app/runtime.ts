import {
  AttractorSceneFeature,
  type FeatureDefinition,
  FloatingImagesFeature,
  PortfolioStageFeature,
  ScreensaverFeature,
  SlidePlayerFeature,
  SlideshowFeature,
} from "../src/spaceface.js";
import { APP_CONTRACT, getFeatureContract } from "./contract.js";

export function createRuntimeFeatureDefinitions(): FeatureDefinition[] {
  return [
    {
      featureId: getFeatureContract("floating-images").selector,
      create: () => new FloatingImagesFeature(),
    },
    {
      featureId: getFeatureContract("attractor-scene").selector,
      create: () =>
        new AttractorSceneFeature({
          rotateMs: APP_CONTRACT.defaults.attractorSceneRotateMs,
        }),
    },
    {
      featureId: getFeatureContract("screensaver").selector,
      create: () =>
        new ScreensaverFeature({
          idleMs: APP_CONTRACT.defaults.screensaverIdleMs,
          defaultScene: APP_CONTRACT.defaults.screensaverDefaultScene,
          scenePartialUrls: APP_CONTRACT.defaults.screensaverScenePartialUrls,
          partialAssetAttributes: APP_CONTRACT.partialAssetAttributes,
        }),
    },
    {
      featureId: getFeatureContract("portfolio-stage").selector,
      create: () => new PortfolioStageFeature(),
    },
    {
      featureId: getFeatureContract("slideshow").selector,
      create: () =>
        new SlideshowFeature({
          autoplayMs: APP_CONTRACT.defaults.slideshowAutoplayMs,
        }),
    },
    {
      featureId: getFeatureContract("slideplayer").selector,
      create: () =>
        new SlidePlayerFeature({
          autoplayMs: APP_CONTRACT.defaults.slideshowAutoplayMs,
        }),
    },
  ];
}
