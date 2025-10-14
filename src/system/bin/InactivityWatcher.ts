// src/spaceface/system/bin/InactivityWatcher.ts

export const VERSION = 'nextworld-1.2.1' as const;

import { EventWatcher } from './EventWatcher.js';
import { eventBus } from './EventBus.js';
import { throttle } from '../features/bin/timing.js';

export interface InactivityWatcherOptionsInterface {
    inactivityDelay: number;
    debug?: boolean;
}

export class InactivityWatcher extends EventWatcher {
    private static _instance: InactivityWatcher | null = null;

    private inactivityDelay: number;
    private lastActiveAt: number;
    private timer?: number;
    private userIsInactive: boolean = false;
    private throttledReset: () => void;

    constructor(target: EventTarget, options: InactivityWatcherOptionsInterface) {
        super(target, options.debug ?? false);
        this.inactivityDelay = options.inactivityDelay;
        this.lastActiveAt = Date.now();
        this.throttledReset = throttle(() => this.resetTimer(), 200);

        this.log(`Initialized with inactivityDelay=${this.inactivityDelay}ms`);

        this.addEventListeners();
    }

    static getInstance(options: InactivityWatcherOptionsInterface & { target?: EventTarget }): InactivityWatcher {
        if (!this._instance) {
            this._instance = new InactivityWatcher(options.target ?? document, options);
            return this._instance;
        }
        // If requested options differ, allow updating runtime inactivityDelay
        if (typeof options.inactivityDelay === 'number' && this._instance.inactivityDelay !== options.inactivityDelay) {
            this._instance.inactivityDelay = options.inactivityDelay;
            this._instance.log(`Updated inactivityDelay to ${this._instance.inactivityDelay}ms`);
            // reset timer with new delay
            this._instance.resetTimer();
        }
        return this._instance;
    }

    protected addEventListeners(): void {
        // register via EventWatcher helper so listeners are tracked for cleanup
        this.addDomListener('mousemove', this.throttledReset);
        this.addDomListener('keydown', this.throttledReset);
        this.addDomListener('scroll', this.throttledReset);
        this.addDomListener('visibilitychange', this.throttledReset);

        this.resetTimer();
    }

    protected removeEventListeners(): void {
        // remove tracked DOM listeners
        this.removeAllDomListeners();

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    private resetTimer() {
        const now = Date.now();
        this.lastActiveAt = now;

        if (this.userIsInactive) {
            this.userIsInactive = false;
            eventBus.emit('user:active', {
                lastActiveAt: this.lastActiveAt,
                inactivityDelay: this.inactivityDelay,
                visible: document.visibilityState === 'visible'
            });
            this.log('User is active');
        }

        if (this.timer) clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.setInactive(), this.inactivityDelay);
    }

    private setInactive() {
        this.userIsInactive = true;
        const now = Date.now();
        eventBus.emit('user:inactive', {
            lastActiveAt: this.lastActiveAt,
            inactiveAt: now,
            inactivityDelay: this.inactivityDelay,
            visible: document.visibilityState === 'visible'
        });
        this.log('User is inactive');
    }
}
