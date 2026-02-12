import type { AppConfigOptions, AppRuntimeConfig, PartialLoaderInstance } from './types.js';
export declare class AppConfig {
    config: AppRuntimeConfig;
    constructor(options?: AppConfigOptions);
}
export declare class SpacefaceCore {
    static EVENT_LOG: string;
    static EVENT_TELEMETRY: string;
    appConfig: AppConfig;
    debug: boolean;
    pageType: string;
    startTime: number;
    private featureModules;
    private featureCache;
    private inactivityWatcher;
    private screensaverController;
    private slideshows;
    private floatingImagesManagers;
    private swManager?;
    private _partialUnsub?;
    private _partialObserver?;
    private pjaxFeatures;
    constructor(options?: AppConfigOptions);
    log(level: 'debug' | 'info' | 'warn' | 'error', ...args: unknown[]): void;
    private resolvePageType;
    private loadFeatureModule;
    initBase(): Promise<void>;
    finishInit(): void;
    initInactivityWatcher(): Promise<void>;
    initSlidePlayer(): Promise<void>;
    initScreensaver(): Promise<void>;
    initServiceWorker(): Promise<void>;
    initPartialLoader(): Promise<PartialLoaderInstance | null>;
    initDomFeatures(): Promise<void>;
    initOnceFeatures(): Promise<void>;
    registerPjaxFeature(name: string, init: () => Promise<void> | void, when?: (pageType: string) => boolean): void;
    handlePjaxComplete(): Promise<void>;
    destroy(): void;
    private emitFeatureTelemetry;
    initFloatingImages(): Promise<void>;
    private destroyFloatingImagesManagers;
}
