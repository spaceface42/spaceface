import { generateId, eventBus, DomReadyPromise, InactivityWatcher } from './symlink.js';
export class AppConfig {
    config;
    constructor(options = {}) {
        this.config = {
            hostname: options.hostname ?? window.location.hostname,
            production: options.production ?? (window.location.hostname !== 'localhost' &&
                !window.location.hostname.includes('127.0.0.1')),
            features: options.features ?? {},
            ...options,
        };
    }
}
export class SpacefaceCore {
    static EVENT_LOG = 'log';
    static EVENT_TELEMETRY = 'telemetry';
    appConfig;
    debug;
    pageType;
    startTime;
    featureModules;
    featureCache = new Map();
    inactivityWatcher = null;
    screensaverController = null;
    slideshows = [];
    floatingImagesManagers = [];
    _partialUnsub;
    _partialObserver;
    pjaxFeatures = new Map();
    constructor(options = {}) {
        this.appConfig = new AppConfig(options);
        this.debug = !!this.appConfig.config.debug;
        this.pageType = this.resolvePageType();
        this.startTime = performance.now();
        this.featureModules = {
            partialLoader: () => import('../system/bin/PartialLoader.js'),
            slideplayer: () => import('../system/features/SlidePlayer/SlidePlayer.js'),
            screensaver: () => import('../system/features/Screensaver/ScreensaverController.js'),
            floatingImages: () => import('../system/features/FloatingImages/FloatingImagesManager.js'),
        };
        if (!this.appConfig.config.features) {
            this.log('warn', 'No features specified in config');
        }
    }
    log(level, ...args) {
        if (!this.debug && level === 'debug')
            return;
        const [first, ...rest] = args;
        const message = typeof first === 'string' ? first : '';
        const data = typeof first === 'string' ? (rest.length ? rest : undefined) : (args.length ? args : undefined);
        const payload = {
            level,
            args,
            scope: 'Spaceface',
            message,
            data,
            time: Date.now(),
        };
        eventBus.emit(SpacefaceCore.EVENT_LOG, payload);
        if (this.debug) {
            console[level]?.(`[spaceface] [${level.toUpperCase()}]`, ...args);
        }
    }
    resolvePageType() {
        const body = document.body;
        if (body.dataset.page)
            return body.dataset.page;
        const rawPath = window.location.pathname;
        const path = rawPath.replace(/\/+$/, '') || '/';
        if (path === '/')
            return 'home';
        const segment = path.split('/').filter(Boolean).pop() ?? 'default';
        return segment
            .replace(/\.html$/i, '')
            .replace(/^_+/, '')
            || 'default';
    }
    async loadFeatureModule(name) {
        if (this.featureCache.has(name))
            return this.featureCache.get(name);
        try {
            const module = await this.featureModules[name]?.();
            if (!module) {
                throw new Error(`Module "${name}" could not be loaded.`);
            }
            this.featureCache.set(name, module);
            return module;
        }
        catch (err) {
            this.log('error', `Failed to load module "${name}"`, err);
            this.featureCache.set(name, null);
            return null;
        }
    }
    async initBase() {
        this.log('info', `App initialization started (Page: ${this.pageType})`);
        document.documentElement.classList.add('js-enabled', `page-${this.pageType}`);
        await DomReadyPromise.ready();
        this.log('info', 'DOM ready');
    }
    finishInit() {
        const duration = (performance.now() - this.startTime).toFixed(2);
        this.log('info', `App initialized in ${duration}ms`);
        eventBus.emit(SpacefaceCore.EVENT_TELEMETRY, {
            type: 'init:duration',
            value: duration,
            page: this.pageType,
        });
    }
    async initInactivityWatcher() {
        const start = performance.now();
        const screensaver = this.appConfig.config.features.screensaver;
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
        }
        catch (error) {
            this.emitFeatureTelemetry('inactivityWatcher', start, 'error', error);
            throw error;
        }
    }
    async initSlidePlayer() {
        const start = performance.now();
        const slideplayer = this.appConfig.config.features.slideplayer;
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
                slideshow.ready?.then?.(() => { });
                return slideshow;
            });
            this.log('info', `${this.slideshows.length} SlidePlayer instance(s) loaded`);
            this.emitFeatureTelemetry('slideplayer', start, 'success');
        }
        catch (error) {
            this.emitFeatureTelemetry('slideplayer', start, 'error', error);
            throw error;
        }
    }
    async initScreensaver() {
        const start = performance.now();
        const screensaver = this.appConfig.config.features.screensaver;
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
        }
        catch (error) {
            this.log('error', 'Failed to initialize screensaver:', error);
            this.emitFeatureTelemetry('screensaver', start, 'error', error);
        }
    }
    async initPartialLoader() {
        const start = performance.now();
        const config = this.appConfig.config.features.partialLoader;
        if (!config?.enabled) {
            this.emitFeatureTelemetry('partialLoader', start, 'skipped');
            return null;
        }
        try {
            const module = await this.loadFeatureModule('partialLoader');
            const PartialLoader = module?.PartialLoader;
            if (!PartialLoader) {
                this.emitFeatureTelemetry('partialLoader', start, 'skipped');
                return null;
            }
            const loader = new PartialLoader({
                debug: config.debug ?? this.debug,
                baseUrl: config.baseUrl ?? '/',
                cacheEnabled: config.cacheEnabled ?? true,
            });
            await loader.loadContainer(document);
            const watchResult = loader.watch?.(document);
            if (typeof watchResult === 'function') {
                this._partialUnsub = watchResult;
            }
            else if (watchResult) {
                this._partialObserver = watchResult;
            }
            this.log('info', 'PartialLoader initialized');
            this.emitFeatureTelemetry('partialLoader', start, 'success');
            return loader;
        }
        catch (error) {
            this.emitFeatureTelemetry('partialLoader', start, 'error', error);
            throw error;
        }
    }
    async initDomFeatures() {
        await this.initSlidePlayer();
        await this.initFloatingImages();
    }
    async initOnceFeatures() {
        const initTasks = [
            this.initInactivityWatcher(),
            this.initScreensaver(),
        ];
        await Promise.allSettled(initTasks);
        this.log('info', `Page features initialized for: ${this.pageType}`);
    }
    registerPjaxFeature(name, init, when) {
        if (this.pjaxFeatures.has(name))
            return;
        this.pjaxFeatures.set(name, { init, when });
    }
    async handlePjaxComplete() {
        this.pageType = this.resolvePageType();
        document.documentElement.classList.add(`page-${this.pageType}`);
        this.slideshows.forEach(slideshow => slideshow.destroy?.());
        this.slideshows = [];
        this.destroyFloatingImagesManagers();
        for (const { init, when } of this.pjaxFeatures.values()) {
            if (when && !when(this.pageType))
                continue;
            await init();
        }
    }
    destroy() {
        this._partialUnsub?.();
        this._partialObserver?.disconnect?.();
        this.slideshows.forEach(slideshow => slideshow.destroy?.());
        this.destroyFloatingImagesManagers();
        this.inactivityWatcher?.destroy?.();
        this.screensaverController?.destroy?.();
        this.featureCache.clear();
        document.querySelector('[id^="screensaver"]')?.remove();
        this.log('info', 'Spaceface destroyed, all resources released.');
    }
    emitFeatureTelemetry(feature, startTime, status, error) {
        const duration = (performance.now() - startTime).toFixed(2);
        eventBus.emit(SpacefaceCore.EVENT_TELEMETRY, {
            type: 'feature:init',
            feature,
            status,
            duration,
            page: this.pageType,
            error,
        });
    }
    async initFloatingImages() {
        const start = performance.now();
        const floatingImages = this.appConfig.config.features.floatingImages;
        if (!floatingImages) {
            this.emitFeatureTelemetry('floatingImages', start, 'skipped');
            return;
        }
        try {
            const module = await this.loadFeatureModule('floatingImages');
            const FloatingImagesManager = module?.FloatingImagesManager;
            if (!FloatingImagesManager) {
                this.emitFeatureTelemetry('floatingImages', start, 'skipped');
                return;
            }
            const selector = floatingImages.selector ?? '.floating-images-container';
            const containers = Array.from(document.querySelectorAll(selector));
            if (!containers.length) {
                this.emitFeatureTelemetry('floatingImages', start, 'skipped');
                return;
            }
            this.destroyFloatingImagesManagers();
            const shouldPauseOnScreensaver = floatingImages.pauseOnScreensaver ?? (this.pageType === 'floatingimages');
            this.floatingImagesManagers = containers.map(container => {
                return new FloatingImagesManager(container, {
                    maxImages: floatingImages.maxImages,
                    debug: floatingImages.debug ?? this.debug,
                    hoverBehavior: floatingImages.hoverBehavior ?? 'none',
                    hoverSlowMultiplier: floatingImages.hoverSlowMultiplier ?? 0.2,
                    tapToFreeze: floatingImages.tapToFreeze ?? true,
                    pauseOnScreensaver: shouldPauseOnScreensaver,
                });
            });
            this.log('info', `${this.floatingImagesManagers.length} FloatingImages instance(s) loaded`);
            this.emitFeatureTelemetry('floatingImages', start, 'success');
        }
        catch (error) {
            this.emitFeatureTelemetry('floatingImages', start, 'error', error);
            throw error;
        }
    }
    destroyFloatingImagesManagers() {
        this.floatingImagesManagers.forEach(manager => manager.destroy?.());
        this.floatingImagesManagers = [];
    }
}
//# sourceMappingURL=spaceface.core.js.map