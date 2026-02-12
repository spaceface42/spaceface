import type { FloatingImagesManagerOptionsInterface } from '../system/features/FloatingImages/types.js';
import type { FloatingImagesManagerInterface, ScreensaverControllerOptionsInterface } from '../system/types/features.js';
import type { PartialLoadResultInterface, PartialLoaderOptionsInterface } from '../system/types/bin.js';
import type { ServiceWorkerCustomConfig } from '../system/bin/ServiceWorkerManager.js';
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
export interface SlidePlayerInstance {
    ready?: Promise<void>;
    destroy?: () => void;
}
export interface ScreensaverControllerInstance {
    init?: () => Promise<void>;
    destroy?: () => void;
}
export interface PartialLoaderInstance {
    loadContainer: (container?: ParentNode) => Promise<PartialLoadResultInterface[]>;
    watch?: (container: HTMLElement | Document) => MutationObserver | void;
}
export interface PartialLoaderModule {
    PartialLoader: new (options?: PartialLoaderOptionsInterface) => PartialLoaderInstance;
}
export interface SlidePlayerModule {
    SlidePlayer: new (containerOrSelector: string | HTMLElement, options?: {
        interval?: number;
        includePicture?: boolean;
    }) => SlidePlayerInstance;
}
export interface ScreensaverControllerModule {
    ScreensaverController: new (options: ScreensaverControllerOptionsInterface & {
        debug?: boolean;
    }) => ScreensaverControllerInstance;
}
export interface FloatingImagesModule {
    FloatingImagesManager: new (container: HTMLElement, options?: FloatingImagesManagerOptionsInterface) => FloatingImagesManagerInterface;
}
export interface ServiceWorkerManagerInstance {
    register: () => Promise<ServiceWorkerRegistration | null>;
    configure: () => void;
}
export interface ServiceWorkerModule {
    ServiceWorkerManager: new (swPath?: string, options?: RegistrationOptions, customConfig?: ServiceWorkerCustomConfig) => ServiceWorkerManagerInstance;
}
export interface FeatureModuleMap {
    partialLoader: PartialLoaderModule;
    slideplayer: SlidePlayerModule;
    screensaver: ScreensaverControllerModule;
    floatingImages: FloatingImagesModule;
    serviceWorker: ServiceWorkerModule;
}
