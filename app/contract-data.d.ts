export interface FeatureContract {
  id: string;
  featureId: string;
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
  featureIds: string[];
  hooks?: HookContract[];
}

export interface PartialContract {
  id: string;
  file: string;
  hostHook: string;
  featureIds: string[];
  hooks: HookContract[];
}

export interface AppContract {
  name: string;
  sourceDir: string;
  outputDir: string;
  defaults: {
    attractorSceneRotateMs: number;
    screensaverIdleMs: number;
    screensaverDefaultScene: string;
    screensaverScenePartialUrls: Record<string, string>;
    slideshowAutoplayMs: number;
  };
  pageHooks: string[];
  activityInputs: string[];
  partialAssetAttributes: string[];
  features: FeatureContract[];
  routes: RouteContract[];
  partials: PartialContract[];
}

export const APP_CONTRACT: AppContract;
