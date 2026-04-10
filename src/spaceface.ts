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
