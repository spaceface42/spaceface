// src/spaceface/system/bin/InactivityWatcher.ts

export const VERSION = 'nextworld-1.2.0' as const;

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
        }
        return this._instance;
    }

    protected addEventListeners(): void {
        this.target.addEventListener('mousemove', this.throttledReset);
        this.target.addEventListener('keydown', this.throttledReset);
        this.target.addEventListener('scroll', this.throttledReset);
        this.target.addEventListener('visibilitychange', this.throttledReset);

        this.resetTimer();
    }

    protected removeEventListeners(): void {
        this.target.removeEventListener('mousemove', this.throttledReset);
        this.target.removeEventListener('keydown', this.throttledReset);
        this.target.removeEventListener('scroll', this.throttledReset);
        this.target.removeEventListener('visibilitychange', this.throttledReset);

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
