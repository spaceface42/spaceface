// src/spaceface/app/bin/main.ts

import {
    generateId,
    eventBus,
    DomReadyPromise,
    InactivityWatcher,
    ServiceWorkerManager,
    FloatingImagesManagerInterface
} from './symlink.js';
import type { LogPayload } from '../system/types/bin.js';

// AppConfig
interface AppConfigOptions {
    features?: Record<string, any>;
    debug?: boolean;
    [key: string]: any;
}

export class AppConfig {
    public config: Record<string, any>;

    constructor(options: AppConfigOptions = {}) {
        this.config = {
            hostname: window.location.hostname,
            production:
                window.location.hostname !== 'localhost' &&
                !window.location.hostname.includes('127.0.0.1'),
            features: options.features ?? {},
            ...options,
        };
    }

    public get(key: string): any {
        return key.split('.').reduce((value: any, k: string) => {
            if (value?.[k] === undefined) {
                console.log(`[spaceface] Config key "${key}" is undefined`);
                return undefined;
            }
            return value[k];
        }, this.config);
    }
}

// Spaceface
interface FeatureModuleMap {
    partialLoader: any;
    slideplayer: any;
    screensaver: any;
    serviceWorker: any;
}

interface SpacefaceOptions extends AppConfigOptions {}

export class Spaceface {
    static EVENT_LOG = 'log';
    static EVENT_TELEMETRY = 'telemetry';

    public appConfig: AppConfig;
    public debug: boolean;
    public pageType: string;
    public startTime: number;

    private featureModules: Record<string, () => Promise<any>>;
    private featureCache = new Map<string, any>();
    private inactivityWatcher: InactivityWatcher | null = null;
    private screensaverController: FloatingImagesManagerInterface | null = null;
    private slideshows: any[] = [];
    private swManager?: ServiceWorkerManager;
    private _partialUnsub?: () => void;
    private _partialObserver?: any;

    constructor(options: AppConfigOptions = {}) {
        this.appConfig = new AppConfig(options);
        this.debug = !!this.appConfig.config.debug;
        this.pageType = this.resolvePageType();
        this.startTime = performance.now();

        this.featureModules = {
            partialLoader: () => import('../system/bin/PartialLoader.js'),
            slideplayer: () => import('../system/features/SlidePlayer/SlidePlayer.js'),
            screensaver: () => import('../system/features/Screensaver/ScreensaverController.js'),
            serviceWorker: () => import('../system/bin/ServiceWorkerManager.js'),
        };

        if (!this.appConfig.config.features) {
            this.log('warn', 'No features specified in config');
        }
    }

    public log(level: 'debug' | 'info' | 'warn' | 'error', ...args: any[]): void {
        if (!this.debug && level === 'debug') return;
        const [first, ...rest] = args;
        const message = typeof first === 'string' ? first : '';
        const data = typeof first === 'string' ? (rest.length ? rest : undefined) : (args.length ? args : undefined);
        const payload: LogPayload & { args: any[] } = {
            level,
            args,
            scope: 'Spaceface',
            message,
            data,
            time: Date.now(),
        };
        eventBus.emit(Spaceface.EVENT_LOG, payload);
        if (this.debug) {
            console[level]?.(`[spaceface] [${level.toUpperCase()}]`, ...args);
        }
    }

    private resolvePageType(): string {
        const body = document.body;
        if (body.dataset.page) return body.dataset.page;
        const path = window.location.pathname;
        return path === '/' ? 'home' : path === '/app' ? 'app' : 'default';
    }

    private async loadFeatureModule(name: string): Promise<any> {
        if (this.featureCache.has(name)) return this.featureCache.get(name);
        try {
            const module = await this.featureModules[name]?.();
            if (!module) {
                throw new Error(`Module "${name}" could not be loaded.`);
            }
            this.featureCache.set(name, module);
            return module;
        } catch (err) {
            this.log('error', `Failed to load module "${name}"`, err);
            this.featureCache.set(name, null);
            return null;
        }
    }

    private async initializeFeatures(): Promise<void> {
        const initTasks = [
            this.initInactivityWatcher(),
            this.initPartialLoader(),
            this.initSlidePlayer(),
            this.initScreensaver(),
            this.initServiceWorker(),
        ];
        await Promise.allSettled(initTasks);
        this.log('info', `Page features initialized for: ${this.pageType}`);
    }

    public async init(): Promise<void> {
        this.log('info', `App initialization started (Page: ${this.pageType})`);
        document.documentElement.classList.add('js-enabled', `page-${this.pageType}`);
        await DomReadyPromise.ready();
        this.log('info', 'DOM ready');
        await this.initializeFeatures();
        const duration = (performance.now() - this.startTime).toFixed(2);
        this.log('info', `App initialized in ${duration}ms`);
        eventBus.emit(Spaceface.EVENT_TELEMETRY, {
            type: 'init:duration',
            value: duration,
            page: this.pageType,
        });
    }

    public destroy(): void {
        this._partialUnsub?.();
        this._partialObserver?.disconnect?.();
        this.slideshows.forEach(slideshow => slideshow.destroy?.());
        this.inactivityWatcher?.destroy?.();
        this.screensaverController?.destroy?.();
        this.featureCache.clear();
        document.querySelector('[id^="screensaver"]')?.remove();
        this.log('info', 'Spaceface destroyed, all resources released.');
    }

    // Initialization methods for individual features
    public async initInactivityWatcher(): Promise<void> {
        const screensaver = this.appConfig.config.features?.screensaver;
        if (!screensaver || this.inactivityWatcher) return;
        this.inactivityWatcher = InactivityWatcher.getInstance({
            inactivityDelay: screensaver.delay ?? 3000,
        });
        this.log('debug', `InactivityWatcher initialized with delay=${screensaver.delay ?? 3000}ms`);
    }

    public async initSlidePlayer(): Promise<void> {
        const slideplayer = this.appConfig.config.features?.slideplayer;
        if (!slideplayer) return;
        const module = await this.loadFeatureModule('slideplayer');
        const SlidePlayer = module?.SlidePlayer;
        if (!SlidePlayer) return;
        this.slideshows = Array.from(document.querySelectorAll('.slideshow-container')).map(node => {
            const slideshow = new SlidePlayer(node, {
                interval: slideplayer.interval ?? 5000,
                includePicture: slideplayer.includePicture ?? false,
            });
            slideshow.ready?.then?.(() => {});
            return slideshow;
        });
        this.log('info', `${this.slideshows.length} SlidePlayer instance(s) loaded`);
    }

    public async initScreensaver(): Promise<void> {
        const screensaver = this.appConfig.config.features?.screensaver;
        if (!screensaver?.partialUrl) {
            this.log('error', "Screensaver configuration is missing or incomplete");
            return;
        }
        try {
            const module = await this.loadFeatureModule('screensaver');
            const ScreensaverController = module?.ScreensaverController;
            if (!ScreensaverController) {
                throw new Error('ScreensaverController module is unavailable.');
            }
            const id = generateId('screensaver', 9);
            const container = Object.assign(document.createElement('div'), {
                id,
                style: 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999; display: none;',
            });
            document.body.appendChild(container);
            this.screensaverController = new ScreensaverController({
                partialUrl: screensaver.partialUrl,
                targetSelector: `#${id}`,
                ...(screensaver.delay !== undefined && { inactivityDelay: screensaver.delay }),
            });
            await this.screensaverController?.init?.();
            eventBus.emit('screensaver:initialized', id);
            this.log('info', 'Screensaver initialized:', id);
        } catch (error) {
            this.log('error', 'Failed to initialize screensaver:', error);
        }
    }

    public async initServiceWorker(): Promise<void> {
        if (!this.appConfig.config.features?.serviceWorker) return;
        const module = await this.loadFeatureModule('serviceWorker');
        const Manager = module?.default;
        if (!Manager) return;
        this.swManager = new Manager('/sw.js', {}, {
            strategy: { images: 'cache-first', others: 'network-first' },
        });
        if (this.swManager) {
            await this.swManager.register();
            this.swManager.configure();
            this.log('info', 'Service Worker registered and configured');
        }
    }

    public async initPartialLoader(): Promise<any> {
        const config = this.appConfig.config.features?.partialLoader;
        if (!config?.enabled) return null;
        const module = await this.loadFeatureModule('partialLoader');
        const PartialLoader = module?.PartialLoader;
        if (!PartialLoader) return null;
        const loader = new PartialLoader({
            debug: config.debug ?? this.debug,
            baseUrl: config.baseUrl ?? '/',
            cacheEnabled: config.cacheEnabled ?? true,
        });
        await loader.loadContainer(document);
        const watchResult = loader.watch?.(document);
        if (typeof watchResult === 'function') {
            this._partialUnsub = watchResult;
        } else {
            this._partialObserver = watchResult;
        }
        this.log('info', 'PartialLoader initialized');
        return loader;
    }
}

// Define a type for the payload
interface EventPayload {
    level?: string;
    args?: any[];
    [key: string]: any;
}

// Dev Event Logging
const isDev = ['localhost', '127.0.0.1'].some(host =>
    window.location.hostname.includes(host),
);

if (isDev) {
    eventBus.onAny((eventName: string, payload: EventPayload) => {
        const { level = 'log', args, ...otherDetails } = payload;
        if (!payload) return console.log(`[spaceface onAny] Event: ${eventName} – no payload!`);
        if (typeof payload === 'string') return console.log(`[spaceface onAny] Event: ${eventName} [LOG]`, payload);

        const fullMessage = args ?? otherDetails ?? '(no details)';
        const methodMap: Record<'debug' | 'info' | 'warn' | 'error' | 'log', keyof Console> = {
            debug: 'debug',
            info: 'info',
            warn: 'warn',
            error: 'error',
            log: 'log',
        };
        const method = methodMap[level as keyof typeof methodMap] ?? 'log';
        (console as any)[method](`[SPCFC *] Event: ${eventName} [${level.toUpperCase()}] –`, fullMessage);
    });
}

// Initialize App
const app = new Spaceface({
    features: {
        partialLoader: { enabled: true, debug: true, baseUrl: '/', cacheEnabled: true },
        slideplayer: { interval: 5000, includePicture: false, showDots: false },
        screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
        serviceWorker: true,
    },
});

app.init();

window.addEventListener('beforeunload', () => {
    app.destroy();
    app.log('info', 'App destroyed on beforeunload');
});
