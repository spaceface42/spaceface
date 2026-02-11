export declare const VERSION: "nextworld-1.2.0";
import { InactivityWatcher } from "../../bin/InactivityWatcher.js";
import { PartialFetcher } from "../../bin/PartialFetcher.js";
import type { ScreensaverControllerOptionsInterface } from "../../types/features.js";
export declare class ScreensaverController {
    private readonly partialUrl;
    private readonly targetSelector;
    private readonly inactivityDelay;
    private readonly debug;
    private readonly onError?;
    private screensaverManager;
    private watcher;
    private _destroyed;
    private eventBinder;
    private _partialLoaded;
    private partialFetcher;
    private _loadPromise?;
    private _hideTimeout;
    private _bound;
    private _onInactivity;
    private _onActivity;
    constructor(options: ScreensaverControllerOptionsInterface & {
        watcher?: InactivityWatcher;
        partialFetcher?: typeof PartialFetcher;
        debug?: boolean;
    });
    private log;
    init(): Promise<void>;
    showScreensaver(): Promise<void>;
    hideScreensaver(): void;
    destroy(): void;
    private handleError;
}
