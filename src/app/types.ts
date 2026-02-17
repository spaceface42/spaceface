import type { FloatingImagesManagerOptionsInterface } from '../system/features/FloatingImages/types.js';
import type {
    FloatingImagesManagerInterface,
    ScreensaverControllerOptionsInterface,
    ScrollDeckInterface
} from '../system/types/features.js';
import type { PartialLoadResultInterface, PartialLoaderOptionsInterface } from '../system/types/bin.js';

export interface PartialLoaderFeatureConfig {
    enabled: boolean;
    debug?: boolean;
    baseUrl?: string;
    cacheEnabled?: boolean;
    timeout?: number;
    retryAttempts?: number;
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

export interface ScrollDeckFeatureConfig {
    selector?: string;
    slideSelector?: string;
    trackSelector?: string;
    hudSelector?: string;
    hintSelector?: string;
    autoCreateHud?: boolean;
    includePicture?: boolean;
    debug?: boolean;
    topStripPx?: number;
    gate?: number;
    backZPx?: number;
    backScaleEnd?: number;
    scrollPerSegment?: number;
    hideHintAfter?: number;
}

export interface SpacefaceFeaturesConfig {
    partialLoader?: PartialLoaderFeatureConfig;
    slideplayer?: SlideplayerFeatureConfig;
    screensaver?: ScreensaverFeatureConfig;
    floatingImages?: FloatingImagesFeatureConfig;
    scrollDeck?: ScrollDeckFeatureConfig;
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

export interface ScrollDeckInstance extends ScrollDeckInterface {}

export interface PartialLoaderInstance {
    loadContainer: (container?: ParentNode) => Promise<PartialLoadResultInterface[]>;
    watch?: (container: HTMLElement | Document) => MutationObserver | void;
}

export interface PartialLoaderModule {
    PartialLoader: new (options?: PartialLoaderOptionsInterface) => PartialLoaderInstance;
}

export interface SlidePlayerModule {
    SlidePlayer: new (
        containerOrSelector: string | HTMLElement,
        options?: { interval?: number; includePicture?: boolean }
    ) => SlidePlayerInstance;
}

export interface ScreensaverControllerModule {
    ScreensaverController: new (
        options: ScreensaverControllerOptionsInterface & {
            debug?: boolean;
        }
    ) => ScreensaverControllerInstance;
}

export interface FloatingImagesModule {
    FloatingImagesManager: new (
        container: HTMLElement,
        options?: FloatingImagesManagerOptionsInterface
    ) => FloatingImagesManagerInterface;
}

export interface ScrollDeckModule {
    ScrollDeck: new (
        containerOrSelector: string | HTMLElement,
        options?: ScrollDeckFeatureConfig
    ) => ScrollDeckInstance;
}

export interface FeatureModuleMap {
    partialLoader: PartialLoaderModule;
    slideplayer: SlidePlayerModule;
    screensaver: ScreensaverControllerModule;
    floatingImages: FloatingImagesModule;
    scrollDeck: ScrollDeckModule;
}

export interface ManagedFeatureLifecycle {
    name: string;
    dependsOn?: string[];
    init: () => Promise<void> | void;
    onRouteChange?: (pageType: string) => Promise<void> | void;
    destroy: () => void;
}
