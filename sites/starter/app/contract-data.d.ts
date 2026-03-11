export interface FeatureContract {
  id: string;
  selector: string;
  root: string;
  internals: string[];
  singletonNote?: string;
}

export interface RouteContract {
  id: string;
  file: string;
  page: string;
  navLabel?: string;
  featureSelectors: string[];
  requiredHooks?: string[];
}

export interface PartialContract {
  id: string;
  file: string;
  hostHook: string;
  featureSelectors: string[];
  requiredHooks: string[];
}

export interface AppContract {
  name: string;
  sourceDir: string;
  outputDir: string;
  defaults: {
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
