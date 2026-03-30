export interface FeatureContract {
  id: string;
  selector: string;
  root: string;
  internals: string[];
  singletonNote?: string;
}

export type HookPresence = "required" | "optional";

export interface HookContract {
  selector: string;
  presence: HookPresence;
}

export interface RouteContract {
  id: string;
  file: string;
  page: string;
  navLabel?: string;
  featureSelectors: string[];
  hooks?: HookContract[];
}

export interface PartialContract {
  id: string;
  file: string;
  hostHook: string;
  featureSelectors: string[];
  hooks: HookContract[];
}

export interface AppContract {
  name: string;
  sourceDir: string;
  outputDir: string;
  defaults: {
    idleAttractorIdleMs: number;
    idleAttractorRotateMs: number;
    idleAttractorPartialUrl: string;
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

export const APP_CONTRACT: AppContract;
