export const VERSION = '2.0.0';
import { eventBus } from "../../bin/EventBus.js";
import { EventBinder } from "../../bin/EventBinder.js";
import { InactivityWatcher } from "../../bin/InactivityWatcher.js";
import { PartialFetcher } from "../../bin/PartialFetcher.js";
import { FloatingImagesManager } from "../FloatingImages/FloatingImagesManager.js";
import { EVENTS } from "../../types/events.js";
export class ScreensaverController {
    static STATES = {
        IDLE: 'idle',
        LOADING: 'loading',
        VISIBLE: 'visible',
        HIDING: 'hiding',
        DESTROYED: 'destroyed',
    };
    partialUrl;
    targetSelector;
    inactivityDelay;
    debug;
    onError;
    screensaverManager = null;
    watcher = null;
    _destroyed = false;
    eventBinder;
    _partialLoaded = false;
    partialFetcher;
    _loadPromise;
    _hideTimeout = null;
    _bound = false;
    state = ScreensaverController.STATES.IDLE;
    _onInactivity;
    _onActivity;
    constructor(options) {
        this.partialUrl = options.partialUrl;
        this.targetSelector = options.targetSelector;
        this.inactivityDelay = options.inactivityDelay ?? 12000;
        this.debug = !!options.debug;
        this.watcher = options.watcher ?? null;
        this.partialFetcher = options.partialFetcher ?? PartialFetcher;
        this.onError = options.onError;
        this.eventBinder = new EventBinder(this.debug);
        this._onInactivity = this.showScreensaver.bind(this);
        this._onActivity = this.hideScreensaver.bind(this);
        this.log('info', 'ScreensaverController initialized', {
            partialUrl: this.partialUrl,
            targetSelector: this.targetSelector,
            inactivityDelay: this.inactivityDelay
        });
    }
    log(level, message, data) {
        if (!this.debug && level === 'debug')
            return;
        const payload = { scope: 'ScreensaverController', level, message, data, time: Date.now() };
        eventBus.emit(EVENTS.SCREENSAVER_LOG, { level, message, data });
        eventBus.emit(EVENTS.LOG, payload);
        if (this.debug) {
            const consoleMethodMap = {
                debug: 'debug',
                info: 'info',
                warn: 'warn',
                error: 'error'
            };
            const method = consoleMethodMap[level] ?? 'log';
            console[method](`[ScreensaverController] [${level.toUpperCase()}]`, message, data);
        }
    }
    async init() {
        if (this._destroyed)
            return;
        if (this._bound)
            return;
        try {
            if (!this.watcher) {
                this.watcher = InactivityWatcher.getInstance({
                    inactivityDelay: this.inactivityDelay
                });
            }
            this.eventBinder.bindBus(EVENTS.USER_INACTIVE, this._onInactivity);
            this.eventBinder.bindBus(EVENTS.USER_ACTIVE, this._onActivity);
            this._bound = true;
            this.log('info', 'Bound user inactivity/active events');
        }
        catch (error) {
            this.handleError('Failed to initialize inactivity watcher', error);
        }
    }
    async showScreensaver() {
        if (this._destroyed)
            return;
        if (this.state === ScreensaverController.STATES.VISIBLE || this.state === ScreensaverController.STATES.LOADING)
            return;
        try {
            this.state = ScreensaverController.STATES.LOADING;
            if (!this._partialLoaded) {
                if (!this._loadPromise) {
                    this._loadPromise = this.partialFetcher
                        .load(this.partialUrl, this.targetSelector)
                        .then(() => { this._partialLoaded = true; })
                        .finally(() => { this._loadPromise = undefined; });
                }
                await this._loadPromise;
            }
            const container = document.querySelector(this.targetSelector);
            if (!container) {
                this.state = ScreensaverController.STATES.IDLE;
                this.handleError(`Target selector "${this.targetSelector}" not found`, null);
                return;
            }
            container.style.opacity = '0';
            container.style.display = '';
            void container.offsetWidth;
            container.style.transition = 'opacity 0.5s ease';
            container.style.opacity = '1';
            if (!this.screensaverManager) {
                this.screensaverManager = new FloatingImagesManager(container, { debug: this.debug });
            }
            else {
                this.screensaverManager.destroy();
                this.screensaverManager = new FloatingImagesManager(container, { debug: this.debug });
            }
            this.state = ScreensaverController.STATES.VISIBLE;
            eventBus.emit(EVENTS.SCREENSAVER_SHOWN, { targetSelector: this.targetSelector });
            this.log('info', 'Screensaver displayed');
        }
        catch (error) {
            this.state = ScreensaverController.STATES.IDLE;
            this.handleError('Failed to load or show screensaver', error);
        }
    }
    hideScreensaver() {
        if (this._destroyed)
            return;
        if (this.state === ScreensaverController.STATES.IDLE || this.state === ScreensaverController.STATES.HIDING)
            return;
        try {
            this.state = ScreensaverController.STATES.HIDING;
            const container = document.querySelector(this.targetSelector);
            if (container) {
                container.style.transition = 'opacity 0.5s ease';
                container.style.opacity = '0';
                if (this._hideTimeout) {
                    clearTimeout(this._hideTimeout);
                }
                this._hideTimeout = window.setTimeout(() => {
                    container.style.display = 'none';
                    this.state = ScreensaverController.STATES.IDLE;
                    this._hideTimeout = null;
                }, 500);
            }
            else {
                this.state = ScreensaverController.STATES.IDLE;
            }
            eventBus.emit(EVENTS.SCREENSAVER_HIDDEN, { targetSelector: this.targetSelector });
            this.log('debug', 'Screensaver hidden');
        }
        catch (error) {
            this.state = ScreensaverController.STATES.IDLE;
            this.handleError('Failed to hide screensaver', error);
        }
    }
    destroy() {
        if (this._destroyed)
            return;
        this.hideScreensaver();
        this._destroyed = true;
        this.state = ScreensaverController.STATES.DESTROYED;
        try {
            this.screensaverManager?.destroy();
        }
        catch (err) {
            this.log('warn', 'screensaverManager.destroy() failed', err);
        }
        this.eventBinder.unbindAll();
        this._partialLoaded = false;
        if (this._hideTimeout) {
            clearTimeout(this._hideTimeout);
            this._hideTimeout = null;
        }
        this._loadPromise = undefined;
        this._bound = false;
        this.log('info', 'ScreensaverController destroyed');
    }
    handleError(message, error) {
        eventBus.emit(EVENTS.SCREENSAVER_ERROR, { message, error });
        this.onError?.(message, error);
        this.log('error', message, error);
    }
}
//# sourceMappingURL=ScreensaverController.js.map