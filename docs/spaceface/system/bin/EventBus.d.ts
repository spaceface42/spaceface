export declare const VERSION: "2.0.0";
import { UnsubscribeFn, EventBusInterface } from '../types/bin.js';
import type { SpacefaceEventMap } from '../types/events.js';
export declare class EventBus<TEvents extends Record<string, unknown> = Record<string, unknown>> implements EventBusInterface<TEvents> {
    private listeners;
    private anyListeners;
    private onceWrappers;
    private emittingError;
    private debugMode;
    setDebugMode(enable: boolean): void;
    on<K extends keyof TEvents>(event: K, fn: (payload: TEvents[K]) => any, priority?: number): UnsubscribeFn;
    on<T = any>(event: string, fn: (payload: T) => any, priority?: number): UnsubscribeFn;
    once<K extends keyof TEvents>(event: K, fn: (payload: TEvents[K]) => any, priority?: number): UnsubscribeFn;
    once<T = any>(event: string, fn: (payload: T) => any, priority?: number): UnsubscribeFn;
    off(event: string, fn: Function): void;
    hasListeners(event: string): boolean;
    onAny(fn: (event: keyof TEvents & string, payload: TEvents[keyof TEvents]) => any, priority?: number): UnsubscribeFn;
    offAny(fn: Function): void;
    emit<K extends keyof TEvents>(event: K, payload?: TEvents[K]): void;
    emit<T = any>(event: string, payload?: T): void;
    emitAsync<K extends keyof TEvents>(event: K, payload?: TEvents[K]): Promise<any[]>;
    emitAsync<T = any>(event: string, payload?: T): Promise<any[]>;
    removeAllListeners(event?: string): void;
    listenerCount(event: string): number;
    eventNames(): string[];
    getListeners(event: string): Function[];
    private _handleError;
}
export declare const eventBus: EventBus<SpacefaceEventMap>;
