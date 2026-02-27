import type { ImageMotionMode, MotionImageEngineOptionsInterface } from '../system/features/MotionImages/types.js';
import type { MotionImageEngineInterface, ScreensaverControllerOptionsInterface } from '../system/types/features.js';
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
    motionMode?: ImageMotionMode;
}

export interface FloatingImagesFeatureConfig extends MotionImageEngineOptionsInterface {
    selector?: string;
    motionMode?: ImageMotionMode;
}

export interface ScrollDeckFeatureConfig {
    selector?: string;
    includePicture?: boolean;
    debug?: boolean;
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

export interface PartialLoaderInstance {
    loadContainer: (container?: ParentNode) => Promise<PartialLoadResultInterface[]>;
    watch?: (container: HTMLElement | Document) => MutationObserver | void;
}

export interface ScrollDeckInstance {
    ready?: Promise<void>;
    destroy?: () => void;
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
    DriftImageEngine: new (
        container: HTMLElement,
        options?: MotionImageEngineOptionsInterface
    ) => MotionImageEngineInterface;
    ParallaxDriftImageEngine: new (
        container: HTMLElement,
        options?: MotionImageEngineOptionsInterface
    ) => MotionImageEngineInterface;
    RainImageEngine: new (
        container: HTMLElement,
        options?: MotionImageEngineOptionsInterface
    ) => MotionImageEngineInterface;
    BrownianImageEngine: new (
        container: HTMLElement,
        options?: MotionImageEngineOptionsInterface
    ) => MotionImageEngineInterface;
    GlitchJumpImageEngine: new (
        container: HTMLElement,
        options?: MotionImageEngineOptionsInterface
    ) => MotionImageEngineInterface;
    WarpImageEngine: new (
        container: HTMLElement,
        options?: MotionImageEngineOptionsInterface
    ) => MotionImageEngineInterface;
}

export interface ScrollDeckModule {
    ScrollDeck: new (
        containerOrSelector: string | HTMLElement,
        options?: { includePicture?: boolean; debug?: boolean }
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
