export declare const VERSION: "2.0.0";
import { EventBinderStats, EventBinderInterface } from "../types/bin.js";
export declare class EventBinder implements EventBinderInterface {
    private IBusBindings;
    private domBindings;
    private debugMode;
    private logger;
    constructor(debug?: boolean);
    private debug;
    attachTo(signal: AbortSignal): () => void;
    setDebugMode(enable: boolean): void;
    bindBus(event: string, handler: (...args: any[]) => void): void;
    bindDOM(target: EventTarget, event: string, handler: EventListenerOrEventListenerObject, options?: AddEventListenerOptions | boolean): void;
    unbindAll(): void;
    unbindBus(event: string, handler: (...args: any[]) => void): boolean;
    unbindDOM(target: EventTarget, event: string, handler: EventListenerOrEventListenerObject): boolean;
    getStats(): EventBinderStats;
    hasBindings(): boolean;
    getBindingDetails(): {
        bus: string[];
        dom: string[];
    };
    static withAutoUnbind<T>(callback: (binder: EventBinder) => T | Promise<T>, debug?: boolean): Promise<T> | T;
}
export declare const eventBinder: EventBinder;
