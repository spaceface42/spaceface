export declare const VERSION: "nextworld-1.3.0";
import { UnsubscribeFn, EventBusInterface } from '../types/bin.js';
export declare class EventBus implements EventBusInterface {
    private listeners;
    private anyListeners;
    private onceWrappers;
    private emittingError;
    private debugMode;
    setDebugMode(enable: boolean): void;
    on<T = any>(event: string, fn: (payload: T) => any, priority?: number): UnsubscribeFn;
    once<T = any>(event: string, fn: (payload: T) => any, priority?: number): UnsubscribeFn;
    off(event: string, fn: Function): void;
    hasListeners(event: string): boolean;
    onAny(fn: (event: string, payload: any) => any, priority?: number): UnsubscribeFn;
    offAny(fn: Function): void;
    emit<T = any>(event: string, payload?: T): void;
    emitAsync<T = any>(event: string, payload?: T): Promise<any[]>;
    removeAllListeners(event?: string): void;
    listenerCount(event: string): number;
    eventNames(): string[];
    getListeners(event: string): Function[];
    private _handleError;
}
export declare const eventBus: EventBus;
