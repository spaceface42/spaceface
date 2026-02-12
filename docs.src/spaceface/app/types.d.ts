import type { FloatingImagesManagerOptionsInterface } from '../system/features/FloatingImages/types.js';
export interface PartialLoaderFeatureConfig {
    enabled: boolean;
    debug?: boolean;
    baseUrl?: string;
    cacheEnabled?: boolean;
}
export interface SlideplayerFeatureConfig {
    interval?: number;
    includePicture?: boolean;
}
export interface ScreensaverFeatureConfig {
    delay?: number;
    partialUrl: string;
}
export interface FloatingImagesFeatureConfig extends FloatingImagesManagerOptionsInterface {
    selector?: string;
}
export type ServiceWorkerFeatureConfig = boolean;
export interface SpacefaceFeaturesConfig {
    partialLoader?: PartialLoaderFeatureConfig;
    slideplayer?: SlideplayerFeatureConfig;
    screensaver?: ScreensaverFeatureConfig;
    floatingImages?: FloatingImagesFeatureConfig;
    serviceWorker?: ServiceWorkerFeatureConfig;
}
export interface AppConfigOptions {
    features?: SpacefaceFeaturesConfig;
    debug?: boolean;
    hostname?: string;
    production?: boolean;
}
export interface AppRuntimeConfig extends AppConfigOptions {
    hostname: string;
    production: boolean;
    features: SpacefaceFeaturesConfig;
}
