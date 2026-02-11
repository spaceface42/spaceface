import { generateId, eventBus, DomReadyPromise, InactivityWatcher } from '../symlink.js';
export class AppConfig {
    config;
    constructor(options = {}) {
        this.config = {
            hostname: window.location.hostname,
            production: window.location.hostname !== 'localhost' &&
                !window.location.hostname.includes('127.0.0.1'),
            features: options.features ?? {},
            ...options,
        };
    }
    get(key) {
        return key.split('.').reduce((value, k) => {
            if (value?.[k] === undefined) {
                console.log(`[spaceface] Config key "${key}" is undefined`);
                return undefined;
            }
            return value[k];
        }, this.config);
    }
}
export class Spaceface {
    static EVENT_LOG = 'log';
    static EVENT_TELEMETRY = 'telemetry';
    appConfig;
    config;
    features;
    debug;
    pageType;
    startTime;
    featureModules;
    featureCache;
    inactivityWatcher;
    screensaverController;
    slideshows = [];
    swManager;
    _partialUnsub;
    _partialObserver;
    constructor(options = {}) {
        this.appConfig = new AppConfig(options);
        this.config = this.appConfig.config;
        this.features = this.config.features ?? {};
        this.debug = !!this.config.debug;
        this.pageType = this.resolvePageType();
        this.startTime = performance.now();
        this.featureModules = this.defineFeatureModules();
        this.featureCache = new Map();
        this.inactivityWatcher = null;
        this.screensaverController = null;
        this.validateConfig();
        Object.keys(this.featureModules).forEach((name) => this.loadFeatureModule(name));
    }
    validateConfig() {
        if (!this.config || typeof this.config !== 'object') {
            throw new Error('Invalid or missing configuration object');
        }
        if (!this.config.features)
            this.log('warn', 'No features specified in config');
    }
    log(level, ...args) {
        if (!this.debug && level === 'debug')
            return;
        eventBus.emit(Spaceface.EVENT_LOG, { level, args });
        if (this.debug) {
            const consoleMethodMap = {
                debug: 'debug',
                info: 'info',
                warn: 'warn',
                error: 'error',
            };
            const method = consoleMethodMap[level] ?? 'log';
            console[method](`[spaceface] [${level.toUpperCase()}]`, ...args);
        }
    }
    defineFeatureModules() {
        return {
            partialLoader: () => import('../../system/bin/PartialLoader.js'),
            slideplayer: () => import('../../system/features/SlidePlayer/SlidePlayer.js'),
            screensaver: () => import('../../system/features/Screensaver/ScreensaverController.js'),
            serviceWorker: () => import('../../system/bin/ServiceWorkerManager.js'),
        };
    }
    resolvePageType() {
        const path = window.location.pathname;
        const body = document.body;
        if (body.dataset.page)
            return body.dataset.page;
        if (path === '/')
            return 'home';
        if (path === '/app')
            return 'app';
        return 'default';
    }
    async loadFeatureModule(name) {
        if (!this.featureModules[name] || this.featureCache.has(name)) {
            return this.featureCache.get(name) ?? null;
        }
        try {
            const module = await this.featureModules[name]();
            this.featureCache.set(name, module);
        }
        catch (err) {
            this.log('error', `Failed to load module "${name}"`, err);
            this.featureCache.set(name, null);
        }
        return this.featureCache.get(name);
    }
    async initInactivityWatcher() {
        try {
            const { screensaver } = this.features;
            if (!screensaver || this.inactivityWatcher)
                return;
            this.inactivityWatcher = InactivityWatcher.getInstance({
                inactivityDelay: screensaver.delay ?? 3000,
            });
        }
        catch (err) {
            this.log('error', "Failed to initialize InactivityWatcher", err);
        }
    }
    async initSlidePlayer() {
        try {
            const { slideplayer } = this.features;
            if (!slideplayer)
                return;
            const module = await this.loadFeatureModule('slideplayer');
            const SlidePlayer = module?.SlidePlayer;
            if (!SlidePlayer)
                return;
            this.slideshows = [];
            for (const node of document.querySelectorAll('.slideshow-container')) {
                const slideshow = new SlidePlayer(node, {
                    interval: slideplayer.interval ?? 5000,
                    includePicture: slideplayer.includePicture ?? false,
                });
                if (slideshow.ready?.then)
                    await slideshow.ready;
                this.slideshows.push(slideshow);
            }
            this.log('info', `${this.slideshows.length} SlidePlayer instance(s) loaded`);
        }
        catch (err) {
            this.log('error', "Failed to initialize SlidePlayer", err);
        }
    }
    async initScreensaver() {
        try {
            const { screensaver } = this.features;
            if (!screensaver?.partialUrl) {
                this.log('error', "Screensaver configuration is missing or incomplete");
                return;
            }
            const module = await this.loadFeatureModule('screensaver');
            const ScreensaverController = module?.ScreensaverController;
            if (!ScreensaverController)
                return;
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
            if (this.screensaverController?.init) {
                await this.screensaverController.init();
            }
            eventBus.emit('screensaver:initialized', id);
            this.log('info', 'Screensaver initialized:', id);
        }
        catch (err) {
            this.log('error', "Failed to initialize screensaver", err);
        }
    }
    async initServiceWorker() {
        try {
            if (!this.features.serviceWorker)
                return;
            const module = await this.loadFeatureModule('serviceWorker');
            const Manager = module?.default;
            if (!Manager)
                return;
            const swManager = new Manager('/sw.js', {}, {
                strategy: { images: 'cache-first', others: 'network-first' },
            });
            await swManager.register();
            swManager.configure();
            this.swManager = swManager;
            this.log('info', 'Service Worker registered and configured');
        }
        catch (err) {
            this.log('error', "Service Worker registration failed", err);
        }
    }
    async initPartialLoader() {
        try {
            const config = this.features.partialLoader;
            if (!config?.enabled)
                return null;
            const module = await this.loadFeatureModule('partialLoader');
            const PartialLoader = module?.PartialLoader;
            if (!PartialLoader)
                return null;
            const loader = new PartialLoader({
                debug: config.debug ?? this.debug,
                baseUrl: config.baseUrl ?? '/',
                cacheEnabled: config.cacheEnabled ?? true,
            });
            await loader.loadContainer(document);
            this._partialObserver = loader.watch(document);
            this.log('info', 'PartialLoader initialized');
            return loader;
        }
        catch (err) {
            this.log('error', "PartialLoader initialization failed", err);
            return null;
        }
    }
    async initPageFeatures() {
        try {
            this.log('info', `Initializing features for page type: ${this.pageType}`);
            this.log('info', `Page features initialized for: ${this.pageType}`);
        }
        catch (err) {
            this.log('error', `Page feature initialization failed for ${this.pageType}`, err);
        }
    }
    async init() {
        try {
            this.log('info', `App initialization started (Page: ${this.pageType})`);
            document.documentElement.classList.add('js-enabled', `page-${this.pageType}`);
            await DomReadyPromise.ready();
            this.log('info', 'DOM ready');
            const featurePromises = [
                this.initInactivityWatcher(),
                this.initPartialLoader(),
                this.initSlidePlayer(),
                this.initScreensaver(),
                this.initServiceWorker(),
            ];
            await Promise.allSettled(featurePromises);
            await this.initPageFeatures();
            const duration = (performance.now() - this.startTime).toFixed(2);
            this.log('info', `App initialized in ${duration}ms`);
            eventBus.emit(Spaceface.EVENT_TELEMETRY, {
                type: 'init:duration',
                value: duration,
                page: this.pageType,
            });
        }
        catch (err) {
            this.log('error', "Critical app initialization error", err);
        }
    }
    destroy() {
        if (this._partialUnsub) {
            this._partialUnsub();
            this._partialUnsub = undefined;
        }
    }
}
const isDev = ['localhost', '127.0.0.1'].some(host => window.location.hostname.includes(host));
if (isDev) {
    eventBus.onAny((eventName, payload) => {
        if (!payload)
            return console.log(`[spaceface onAny] Event: ${eventName} – no payload!`);
        if (typeof payload === 'string')
            return console.log(`[spaceface onAny] Event: ${eventName} [LOG]`, payload);
        const { level = 'log', message, args, ...otherDetails } = payload;
        const fullMessage = message ?? args ?? otherDetails ?? '(no details)';
        const consoleMethodMap = {
            debug: 'debug',
            info: 'info',
            warn: 'warn',
            error: 'error',
            log: 'log',
        };
        const method = consoleMethodMap[level] ?? 'log';
        console[method](`[ spaceface onAny ] Event: ${eventName} [${level.toUpperCase()}] –`, fullMessage);
    });
}
const app = new Spaceface({
    features: {
        partialLoader: { enabled: true, debug: false, baseUrl: '/', cacheEnabled: true },
        slideplayer: { interval: 5000, includePicture: false, showDots: false },
        screensaver: { delay: 4500, partialUrl: 'content/feature/screensaver/index.html' },
        serviceWorker: true,
    },
});
app.init();
//# sourceMappingURL=main.js.map
