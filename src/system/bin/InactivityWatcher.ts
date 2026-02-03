// src/spaceface/system/bin/InactivityWatcher.ts

export const VERSION = 'nextworld-1.3.0' as const;

import { EventWatcher } from './EventWatcher.js';
import { eventBus } from './EventBus.js';
import { throttle } from '../features/bin/timing.js';

export interface InactivityWatcherOptionsInterface {
    inactivityDelay: number;
    debug?: boolean;
    target?: EventTarget;
}

export class InactivityWatcher extends EventWatcher {
    private static _instance: InactivityWatcher | null = null;

    private inactivityDelay: number;
    private lastActiveAt: number;
    private timer?: number;
    private userIsInactive: boolean = false;
    private throttledReset: () => void;

    /**
     * Private constructor to enforce singleton pattern.
     * @param target The target to monitor for activity.
     * @param options Configuration options for the watcher.
     */
    private constructor(target: EventTarget, options: InactivityWatcherOptionsInterface) {
        super(target, options.debug ?? false);
        this.inactivityDelay = options.inactivityDelay;
        this.lastActiveAt = Date.now();
        this.throttledReset = throttle(() => this.resetTimer(), 200);

        this.log(`Initialized with inactivityDelay=${this.inactivityDelay}ms`);
        this.addEventListeners();
    }

    /**
     * Get the singleton instance of the InactivityWatcher.
     * @param options Configuration options for the watcher.
     * @returns The singleton instance.
     */
    static getInstance(options: InactivityWatcherOptionsInterface): InactivityWatcher {
        if (!this._instance) {
            this._instance = new InactivityWatcher(options.target ?? document, options);
        }
        return this._instance;
    }

    /**
     * Add event listeners to monitor user activity.
     */
    protected addEventListeners(): void {
        this.addDomListener('mousemove', this.throttledReset);
        this.addDomListener('keydown', this.throttledReset);
        this.addDomListener('scroll', this.throttledReset);
        this.addDomListener('visibilitychange', this.throttledReset);

        this.resetTimer();
    }

    /**
     * Remove all event listeners and clear the timer.
     */
    protected removeEventListeners(): void {
        this.removeAllDomListeners();

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    /**
     * Reset the inactivity timer and emit an active event if the user was inactive.
     */
    private resetTimer(): void {
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

        if (this.timer) clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.setInactive(), this.inactivityDelay);
    }

    /**
     * Mark the user as inactive and emit an inactive event.
     */
    private setInactive(): void {
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
