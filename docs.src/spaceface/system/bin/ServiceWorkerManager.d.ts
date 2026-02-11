export declare const VERSION: "2.0.0";
export declare class ServiceWorkerManager {
    private swPath;
    private options;
    private customConfig;
    private registration;
    private isSupported;
    constructor(swPath?: string, options?: RegistrationOptions, customConfig?: Record<string, any>);
    register(): Promise<ServiceWorkerRegistration | null>;
    configure(): void;
    unregister(): Promise<boolean>;
    update(): Promise<void | null>;
    getStatus(): 'unregistered' | 'installing' | 'waiting' | 'active' | 'unknown';
    private setupEventListeners;
    postMessage(message: any, transfer?: Transferable[]): Promise<void>;
    waitForMessage(timeout?: number): Promise<any>;
    activateWaiting(): Promise<boolean>;
    setStrategy(config?: Record<string, any>): void;
    onUpdateAvailable?(newWorker: ServiceWorker): void;
    onControllerChange?(): void;
}
