export {
  FeatureRegistry,
  type Feature,
  type FeatureDefinition,
  type FeatureMountContext,
  type FeatureServices,
  type FeatureRegistryOptions,
} from "./core/feature.js";

export {
  createEffect,
  createSignal,
  type Signal,
} from "./core/signals.js";

export {
  loadPartialHtml,
  type LoadPartialOptions,
} from "./core/partials.js";

export {
  FrameScheduler,
  globalScheduler,
  type ScheduledTask,
} from "./core/scheduler.js";

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

export {
  initActivityTracking,
  destroyActivityTracking,
  userActivitySignal,
} from "./features/shared/activity.js";
export { featurePauseSignal } from "./features/shared/pauseState.js";
export { screensaverActiveSignal } from "./features/shared/screensaverState.js";

export {
  AttractorSceneFeature,
  type AttractorSceneFeatureOptions,
} from "./features/attractor-scene/AttractorSceneFeature.js";

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
