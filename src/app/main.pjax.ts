// src/spaceface/app/bin/main.pjax.ts

import {
    generateId,
    eventBus,
    DomReadyPromise,
    InactivityWatcher,
    ServiceWorkerManager,
    FloatingImagesManagerInterface
} from './symlink.js';
import type { LogPayload } from '../system/types/bin.js';
import { initPjax } from './pjax.js';

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
        await this.initSlidePlayer();

        const initTasks = [
            this.initInactivityWatcher(),
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

    private emitFeatureTelemetry(
        feature: string,
        startTime: number,
        status: 'success' | 'skipped' | 'error',
        error?: unknown
    ): void {
        const duration = (performance.now() - startTime).toFixed(2);
        eventBus.emit(Spaceface.EVENT_TELEMETRY, {
            type: 'feature:init',
            feature,
            status,
            duration,
            page: this.pageType,
            error,
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

    public async initInactivityWatcher(): Promise<void> {
        const start = performance.now();
        const screensaver = this.appConfig.config.features?.screensaver;
        if (!screensaver || this.inactivityWatcher) {
            this.emitFeatureTelemetry('inactivityWatcher', start, 'skipped');
            return;
        }
        try {
            this.inactivityWatcher = InactivityWatcher.getInstance({
                inactivityDelay: screensaver.delay ?? 3000,
            });
            this.log('debug', `InactivityWatcher initialized with delay=${screensaver.delay ?? 3000}ms`);
            this.emitFeatureTelemetry('inactivityWatcher', start, 'success');
        } catch (error) {
            this.emitFeatureTelemetry('inactivityWatcher', start, 'error', error);
            throw error;
        }
    }

    public async initSlidePlayer(): Promise<void> {
        const start = performance.now();
        const slideplayer = this.appConfig.config.features?.slideplayer;
        if (!slideplayer) {
            this.emitFeatureTelemetry('slideplayer', start, 'skipped');
            return;
        }
        try {
            const module = await this.loadFeatureModule('slideplayer');
            const SlidePlayer = module?.SlidePlayer;
            if (!SlidePlayer) {
                this.emitFeatureTelemetry('slideplayer', start, 'skipped');
                return;
            }
            this.slideshows = Array.from(document.querySelectorAll('.slideshow-container')).map(node => {
                const slideshow = new SlidePlayer(node, {
                    interval: slideplayer.interval ?? 5000,
                    includePicture: slideplayer.includePicture ?? false,
                });
                slideshow.ready?.then?.(() => {});
                return slideshow;
            });
            this.log('info', `${this.slideshows.length} SlidePlayer instance(s) loaded`);
            this.emitFeatureTelemetry('slideplayer', start, 'success');
        } catch (error) {
            this.emitFeatureTelemetry('slideplayer', start, 'error', error);
            throw error;
        }
    }

    public async initScreensaver(): Promise<void> {
        const start = performance.now();
        const screensaver = this.appConfig.config.features?.screensaver;
        if (!screensaver?.partialUrl) {
            this.log('error', "Screensaver configuration is missing or incomplete");
            this.emitFeatureTelemetry('screensaver', start, 'skipped');
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
            this.emitFeatureTelemetry('screensaver', start, 'success');
        } catch (error) {
            this.log('error', 'Failed to initialize screensaver:', error);
            this.emitFeatureTelemetry('screensaver', start, 'error', error);
        }
    }

    public async initServiceWorker(): Promise<void> {
        const start = performance.now();
        if (!this.appConfig.config.features?.serviceWorker) {
            this.emitFeatureTelemetry('serviceWorker', start, 'skipped');
            return;
        }
        try {
            const module = await this.loadFeatureModule('serviceWorker');
            const Manager = module?.default;
            if (!Manager) {
                this.emitFeatureTelemetry('serviceWorker', start, 'skipped');
                return;
            }
            this.swManager = new Manager('/sw.js', {}, {
                strategy: { images: 'cache-first', others: 'network-first' },
            });
            if (this.swManager) {
                await this.swManager.register();
                this.swManager.configure();
                this.log('info', 'Service Worker registered and configured');
                this.emitFeatureTelemetry('serviceWorker', start, 'success');
            }
        } catch (error) {
            this.emitFeatureTelemetry('serviceWorker', start, 'error', error);
            throw error;
        }
    }
}

// Initialize App (PJAX-enabled)
const app = new Spaceface({
    features: {
        slideplayer: { interval: 5000, includePicture: false, showDots: false },
        screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
        serviceWorker: true,
    },
});

app.init().then(() => {
    initPjax({ containerSelector: '[data-pjax="container"]' });
});

window.addEventListener('beforeunload', () => {
    app.destroy();
    app.log('info', 'App destroyed on beforeunload');
});
