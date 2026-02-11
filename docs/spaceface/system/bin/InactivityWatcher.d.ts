export declare const VERSION: "2.0.0";
import { EventWatcher } from './EventWatcher.js';
export interface InactivityWatcherOptionsInterface {
    inactivityDelay: number;
    debug?: boolean;
    target?: EventTarget;
}
export declare class InactivityWatcher extends EventWatcher {
    private static _instance;
    private inactivityDelay;
    private lastActiveAt;
    private timer?;
    private userIsInactive;
    private throttledReset;
    private constructor();
    static getInstance(options: InactivityWatcherOptionsInterface): InactivityWatcher;
    protected addEventListeners(): void;
    protected removeEventListeners(): void;
    private resetTimer;
    private setInactive;
}
