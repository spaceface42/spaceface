export {
  FeatureRegistry,
  type Feature,
  type FeatureDefinition,
  type FeatureMountContext,
  type FeatureRegistryOptions,
} from "./core/feature.js";

export {
  attachConsoleLogSink,
  createLogger,
  subscribeLogs,
  type LogEntry,
  type LogLevel,
  type Logger,
  type LogListener,
  type LogScopeMatcher,
} from "./core/logger.js";

export { initActivityTracking, destroyActivityTracking } from "./features/shared/activity.js";

export {
  IdleAttractorFeature,
  type IdleAttractorFeatureOptions,
} from "./features/idle-attractor/IdleAttractorFeature.js";

export {
  FloatingImagesFeature,
  type FloatingImagesFeatureOptions,
} from "./features/floating-images/FloatingImagesFeature.js";

export {
  PortfolioStageFeature,
  type PortfolioStageFeatureOptions,
} from "./features/portfolio-stage/PortfolioStageFeature.js";

export {
  ScreensaverFeature,
  type ScreensaverFeatureOptions,
} from "./features/screensaver/ScreensaverFeature.js";

export {
  SlideshowFeature,
  type SlideshowFeatureOptions,
} from "./features/slideshow/SlideshowFeature.js";

export {
  SlidePlayerFeature,
  type SlidePlayerFeatureOptions,
} from "./features/slideplayer/SlidePlayerFeature.js";
