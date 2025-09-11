// src/spaceface/system/bin/InactivityWatcher.ts

export const VERSION = 'nextworld-1.2.0';

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

    constructor(target: EventTarget, options: InactivityWatcherOptionsInterface) {
        super(target, options.debug ?? false);
        this.inactivityDelay = options.inactivityDelay;
        this.lastActiveAt = Date.now();

        this.log(`Initialized with inactivityDelay=${this.inactivityDelay}ms`);

        this.addEventListeners();
    }

    static getInstance(options: InactivityWatcherOptionsInterface & { target?: EventTarget }): InactivityWatcher {
        if (!this._instance) {
            this._instance = new InactivityWatcher(options.target ?? document, options);
        }
        return this._instance;
    }

    protected addEventListeners(): void {
        const throttledReset = throttle(() => this.resetTimer(), 200);

        // Track user activity
        this.target.addEventListener('mousemove', throttledReset);
        this.target.addEventListener('keydown', throttledReset);
        this.target.addEventListener('scroll', throttledReset);
        this.target.addEventListener('visibilitychange', throttledReset);

        // Start the inactivity timer
        this.resetTimer();
    }

    protected removeEventListeners(): void {
        this.target.removeEventListener('mousemove', this.resetTimer);
        this.target.removeEventListener('keydown', this.resetTimer);
        this.target.removeEventListener('scroll', this.resetTimer);
        this.target.removeEventListener('visibilitychange', this.resetTimer);

        if (this.timer) clearTimeout(this.timer);
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
