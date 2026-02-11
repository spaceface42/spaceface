export const VERSION = '2.0.0';
import { EventWatcher } from './EventWatcher.js';
import { eventBus } from './EventBus.js';
import { throttle } from '../features/bin/timing.js';
export class InactivityWatcher extends EventWatcher {
    static _instance = null;
    inactivityDelay;
    lastActiveAt;
    timer;
    userIsInactive = false;
    throttledReset;
    constructor(target, options) {
        super(target, options.debug ?? false);
        this.inactivityDelay = options.inactivityDelay;
        this.lastActiveAt = Date.now();
        this.throttledReset = throttle(() => this.resetTimer(), 200);
        this.log(`Initialized with inactivityDelay=${this.inactivityDelay}ms`);
        this.addEventListeners();
    }
    static getInstance(options) {
        if (!this._instance) {
            this._instance = new InactivityWatcher(options.target ?? document, options);
        }
        return this._instance;
    }
    addEventListeners() {
        this.addDomListener('mousemove', this.throttledReset);
        this.addDomListener('keydown', this.throttledReset);
        this.addDomListener('scroll', this.throttledReset);
        this.addDomListener('visibilitychange', this.throttledReset);
        this.resetTimer();
    }
    removeEventListeners() {
        this.removeAllDomListeners();
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }
    resetTimer() {
        const now = Date.now();
        this.lastActiveAt = now;
        if (this.userIsInactive) {
            this.userIsInactive = false;
            eventBus.emit('user:active', {
                lastActiveAt: this.lastActiveAt,
                inactivityDelay: this.inactivityDelay,
                visible: document.visibilityState === 'visible',
            });
            this.log('User is active');
        }
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.setInactive(), this.inactivityDelay);
    }
    setInactive() {
        this.userIsInactive = true;
        const now = Date.now();
        eventBus.emit('user:inactive', {
            lastActiveAt: this.lastActiveAt,
            inactiveAt: now,
            inactivityDelay: this.inactivityDelay,
            visible: document.visibilityState === 'visible',
        });
        this.log('User is inactive');
    }
}
//# sourceMappingURL=InactivityWatcher.js.map