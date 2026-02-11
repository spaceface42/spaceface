export declare const VERSION: "nextworld-1.3.0";
export declare abstract class EventWatcher {
    protected readonly target: EventTarget;
    protected readonly debug: boolean;
    protected destroyed: boolean;
    private domListeners;
    private loggedMessages;
    constructor(target: EventTarget, debug?: boolean);
    protected log(levelOrMessage: 'debug' | 'info' | 'warn' | 'error' | string, messageOrData?: unknown, data?: unknown): void;
    protected checkDestroyed(): void;
    destroy(): void;
    protected addDomListener(type: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    protected removeAllDomListeners(): void;
    protected abstract addEventListeners(): void;
    protected abstract removeEventListeners(): void;
}
