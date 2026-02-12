export declare const VERSION: "2.0.0";
export type ServiceWorkerCacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';
export interface ServiceWorkerStrategyConfig {
    images?: ServiceWorkerCacheStrategy;
    others?: ServiceWorkerCacheStrategy;
    [key: string]: ServiceWorkerCacheStrategy | undefined;
}
export interface ServiceWorkerCustomConfig {
    strategy?: ServiceWorkerStrategyConfig;
}
export declare class ServiceWorkerManager {
    private swPath;
    private options;
    private customConfig;
    private registration;
    private isSupported;
    constructor(swPath?: string, options?: RegistrationOptions, customConfig?: ServiceWorkerCustomConfig);
    register(): Promise<ServiceWorkerRegistration | null>;
    configure(): void;
    unregister(): Promise<boolean>;
    update(): Promise<void | null>;
    getStatus(): 'unregistered' | 'installing' | 'waiting' | 'active' | 'unknown';
    private setupEventListeners;
    postMessage(message: unknown, transfer?: Transferable[]): Promise<void>;
    waitForMessage(timeout?: number): Promise<unknown>;
    activateWaiting(): Promise<boolean>;
    setStrategy(config?: ServiceWorkerStrategyConfig): void;
    onUpdateAvailable?(newWorker: ServiceWorker): void;
    onControllerChange?(): void;
}
