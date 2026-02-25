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
    on<K extends keyof TEvents>(event: K, fn: (payload: TEvents[K]) => unknown, priority?: number): UnsubscribeFn;
    on<T = unknown>(event: string, fn: (payload: T) => unknown, priority?: number): UnsubscribeFn;
    once<K extends keyof TEvents>(event: K, fn: (payload: TEvents[K]) => unknown, priority?: number): UnsubscribeFn;
    once<T = unknown>(event: string, fn: (payload: T) => unknown, priority?: number): UnsubscribeFn;
    off(event: string, fn: (...args: unknown[]) => unknown): void;
    hasListeners(event: string): boolean;
    onAny(fn: (event: keyof TEvents & string, payload: TEvents[keyof TEvents]) => unknown, priority?: number): UnsubscribeFn;
    offAny(fn: (...args: unknown[]) => unknown): void;
    emit<K extends keyof TEvents>(event: K, payload?: TEvents[K]): void;
    emit<T = unknown>(event: string, payload?: T): void;
    emitAsync<K extends keyof TEvents>(event: K, payload?: TEvents[K]): Promise<unknown[]>;
    emitAsync<T = unknown>(event: string, payload?: T): Promise<unknown[]>;
    removeAllListeners(event?: string): void;
    listenerCount(event: string): number;
    eventNames(): string[];
    getListeners(event: string): Array<(...args: unknown[]) => unknown>;
    private _handleError;
}
export declare const eventBus: EventBus<SpacefaceEventMap>;
