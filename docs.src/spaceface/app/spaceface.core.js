import { generateId, eventBus, DomReadyPromise, InactivityWatcher } from './symlink.js';
import { EVENTS } from '../system/types/events.js';
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
    static EVENT_LOG = EVENTS.LOG;
    static EVENT_TELEMETRY = EVENTS.TELEMETRY;
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
    managedFeatures = [];
    onceFeatures = [];
    constructor(options = {}) {
        this.appConfig = new AppConfig(options);
        this.appConfig.config.features = this.normalizeFeaturesConfig(this.appConfig.config.features);
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
        this.setupManagedFeatures();
        this.setupOnceFeatures();
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
            eventBus.emit(EVENTS.SCREENSAVER_INITIALIZED, id);
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
                timeout: config.timeout,
                retryAttempts: config.retryAttempts,
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
        await this.runFeatureGraph(this.managedFeatures, 'init');
    }
    async initOnceFeatures() {
        await this.runFeatureGraph(this.onceFeatures, 'init', { continueOnError: true });
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
        await this.runFeatureGraph(this.managedFeatures, 'onRouteChange');
        for (const { init, when } of this.pjaxFeatures.values()) {
            if (when && !when(this.pageType))
                continue;
            await init();
        }
    }
    destroy() {
        this._partialUnsub?.();
        this._partialObserver?.disconnect?.();
        this.managedFeatures.forEach(feature => feature.destroy());
        this.onceFeatures.forEach(feature => feature.destroy());
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
    destroySlidePlayers() {
        this.slideshows.forEach(slideshow => slideshow.destroy?.());
        this.slideshows = [];
    }
    setupManagedFeatures() {
        this.managedFeatures = [
            {
                name: 'slideplayer',
                dependsOn: [],
                init: () => this.initSlidePlayer(),
                onRouteChange: async () => {
                    this.destroySlidePlayers();
                    await this.initSlidePlayer();
                },
                destroy: () => this.destroySlidePlayers(),
            },
            {
                name: 'floatingImages',
                dependsOn: [],
                init: () => this.initFloatingImages(),
                onRouteChange: async () => {
                    this.destroyFloatingImagesManagers();
                    await this.initFloatingImages();
                },
                destroy: () => this.destroyFloatingImagesManagers(),
            },
        ];
    }
    setupOnceFeatures() {
        this.onceFeatures = [
            {
                name: 'inactivityWatcher',
                dependsOn: [],
                init: () => this.initInactivityWatcher(),
                destroy: () => this.inactivityWatcher?.destroy?.(),
            },
            {
                name: 'screensaver',
                dependsOn: ['inactivityWatcher'],
                init: () => this.initScreensaver(),
                destroy: () => this.screensaverController?.destroy?.(),
            },
        ];
    }
    async runFeatureGraph(features, stage, options = {}) {
        const pending = new Map(features.map(feature => [feature.name, feature]));
        const completed = new Set();
        const failed = new Set();
        let guard = 0;
        while (pending.size) {
            guard++;
            if (guard > features.length * 2) {
                throw new Error('Feature dependency graph contains a cycle or unresolved dependency.');
            }
            let progressed = false;
            for (const [name, feature] of Array.from(pending.entries())) {
                const deps = feature.dependsOn ?? [];
                const blockedByFailedDep = deps.some(dep => failed.has(dep));
                if (blockedByFailedDep) {
                    failed.add(name);
                    pending.delete(name);
                    progressed = true;
                    this.log('warn', `Skipping feature "${name}" due to failed dependency`, { deps });
                    continue;
                }
                if (!deps.every(dep => completed.has(dep)))
                    continue;
                try {
                    if (stage === 'onRouteChange' && feature.onRouteChange) {
                        await feature.onRouteChange(this.pageType);
                    }
                    else {
                        await feature.init();
                    }
                    completed.add(name);
                }
                catch (error) {
                    failed.add(name);
                    if (!options.continueOnError) {
                        throw error;
                    }
                    this.log('error', `Feature "${name}" failed during ${stage}`, error);
                }
                finally {
                    pending.delete(name);
                    progressed = true;
                }
            }
            if (!progressed) {
                const unresolved = Array.from(pending.keys()).join(', ');
                throw new Error(`Unresolved feature dependencies: ${unresolved}`);
            }
        }
    }
    getFeatureSnapshot() {
        return {
            pageType: this.pageType,
            managedFeatures: this.managedFeatures.map(f => f.name),
            onceFeatures: this.onceFeatures.map(f => f.name),
            activeSlidePlayers: this.slideshows.length,
            activeFloatingImagesManagers: this.floatingImagesManagers.length,
            inactivityWatcherReady: !!this.inactivityWatcher,
            screensaverReady: !!this.screensaverController,
            partialLoaderWatching: !!(this._partialUnsub || this._partialObserver),
        };
    }
    normalizeFeaturesConfig(features) {
        const normalized = { ...features };
        const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;
        if (normalized.slideplayer) {
            if (normalized.slideplayer.interval !== undefined && !isPositiveNumber(normalized.slideplayer.interval)) {
                this.log('warn', 'Invalid slideplayer.interval; expected positive number. Falling back to default.');
                delete normalized.slideplayer.interval;
            }
        }
        if (normalized.screensaver) {
            if (typeof normalized.screensaver.partialUrl !== 'string' || !normalized.screensaver.partialUrl.trim()) {
                this.log('warn', 'Invalid screensaver.partialUrl; disabling screensaver feature.');
                delete normalized.screensaver;
            }
            else if (normalized.screensaver.delay !== undefined && !isPositiveNumber(normalized.screensaver.delay)) {
                this.log('warn', 'Invalid screensaver.delay; removing delay override.');
                delete normalized.screensaver.delay;
            }
        }
        if (normalized.floatingImages) {
            if (normalized.floatingImages.maxImages !== undefined && !isPositiveNumber(normalized.floatingImages.maxImages)) {
                this.log('warn', 'Invalid floatingImages.maxImages; removing override.');
                delete normalized.floatingImages.maxImages;
            }
            if (normalized.floatingImages.hoverSlowMultiplier !== undefined &&
                (typeof normalized.floatingImages.hoverSlowMultiplier !== 'number' || normalized.floatingImages.hoverSlowMultiplier < 0)) {
                this.log('warn', 'Invalid floatingImages.hoverSlowMultiplier; removing override.');
                delete normalized.floatingImages.hoverSlowMultiplier;
            }
            if (normalized.floatingImages.selector !== undefined &&
                typeof normalized.floatingImages.selector !== 'string') {
                this.log('warn', 'Invalid floatingImages.selector; removing override.');
                delete normalized.floatingImages.selector;
            }
        }
        if (normalized.partialLoader) {
            if (normalized.partialLoader.timeout !== undefined && !isPositiveNumber(normalized.partialLoader.timeout)) {
                this.log('warn', 'Invalid partialLoader.timeout; removing override.');
                delete normalized.partialLoader.timeout;
            }
            if (normalized.partialLoader.retryAttempts !== undefined && !isPositiveNumber(normalized.partialLoader.retryAttempts)) {
                this.log('warn', 'Invalid partialLoader.retryAttempts; removing override.');
                delete normalized.partialLoader.retryAttempts;
            }
        }
        return normalized;
    }
}
//# sourceMappingURL=spaceface.core.js.map