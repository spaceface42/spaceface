interface AppConfigOptions {
    features?: Record<string, any>;
    debug?: boolean;
    [key: string]: any;
}
export declare class AppConfig {
    config: Record<string, any>;
    constructor(options?: AppConfigOptions);
    get(key: string): any;
}
interface SpacefaceOptions extends AppConfigOptions {
}
export declare class Spaceface {
    static EVENT_LOG: string;
    static EVENT_TELEMETRY: string;
    appConfig: AppConfig;
    config: Record<string, any>;
    features: Record<string, any>;
    debug: boolean;
    pageType: string;
    startTime: number;
    private featureModules;
    private featureCache;
    private inactivityWatcher;
    private screensaverController;
    private slideshows;
    private swManager?;
    private _partialUnsub?;
    private _partialObserver?;
    constructor(options?: SpacefaceOptions);
    private validateConfig;
    log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void;
    private defineFeatureModules;
    private resolvePageType;
    private loadFeatureModule;
    initInactivityWatcher(): Promise<void>;
    initSlidePlayer(): Promise<void>;
    initScreensaver(): Promise<void>;
    initServiceWorker(): Promise<void>;
    initPartialLoader(): Promise<any>;
    initPageFeatures(): Promise<void>;
    init(): Promise<void>;
    destroy(): void;
}
export {};
