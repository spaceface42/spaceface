import type { EventBinder } from "../bin/EventBinder.js";

//
//
// domready
export type WaitForElementOptions = {
  timeout?: number;
  root?: ParentNode;
  signal?: AbortSignal;
};

//
//
// eventbinder
export type DomBinding = {
    target: EventTarget;
    event: string;
    handler: EventListenerOrEventListenerObject;
    options: AddEventListenerOptions;
    controller: AbortController;
};

export type EventBinderStats = {
    busEvents: number;
    domEvents: number;
    totalEvents: number;
};

export interface IEventBinder {
    /** Bind an EventBus event */
    bindBus(event: string, handler: (...args: any[]) => void): void;

    /** Bind a DOM event */
    bindDOM(
        target: EventTarget,
        event: string,
        handler: EventListenerOrEventListenerObject,
        options?: AddEventListenerOptions | boolean
    ): void;

    /** Unbind all tracked bus + DOM bindings */
    unbindAll(): void;

    /** Get binding counts */
    getStats(): EventBinderStats;

    /** Check if there are any active bindings */
    hasBindings(): boolean;
}

export type UnsubscribeFn = () => void;

/**
 * Debug payload emitted on "debug:EventBinder" events.
 *
 * Each action produces a payload with a `method` string and a free-form `details` object.
 * Examples of `method`: "bus:bind", "dom:bind", "dom:unbind", "unbindAll", "getStats", "hasBindings".
 */


// Track bus bindings with strong references
export interface IBusBinding {
    event: string;
    handler: (...args: any[]) => void;
    unsubscribe: UnsubscribeFn;
}
// eventbinder

// eventbus
export interface IListener<T = any> {
  fn: (payload: T) => any;
  priority: number;
}

export interface IAnyListener {
  fn: (event: string, payload: any) => any;
  priority: number;
}

export interface IEventBusErrorPayload {
  message: string;
  error: any;
}

export interface IEventBus {
  on<T = any>(event: string, fn: (payload: T) => any, priority?: number): UnsubscribeFn;
  once<T = any>(event: string, fn: (payload: T) => any, priority?: number): void;

  onAny(fn: (event: string, payload: any) => any, priority?: number): UnsubscribeFn;

  off(event: string, fn: Function): void;
  offAny(fn: Function): void;

  emit<T = any>(event: string, payload?: T): void;
  emitAsync<T = any>(event: string, payload?: T): Promise<any[]>;

  removeAllListeners(event?: string): void;

  hasListeners(event: string): boolean;
  listenerCount(event: string): number;
  eventNames(): string[];
  getListeners(event: string): Function[];
}
// eventbus
//
//





//
//
// partialloader
export interface IPartialLoaderOptions {
    debug?: boolean;
    baseUrl?: string;
    cacheEnabled?: boolean;
    timeout?: number;
    retryAttempts?: number;
}

export interface IPartialLoadResult {
    success: boolean;
    url: string;
    cached: boolean;
}

export interface IPartialInfo {
    id?: string;
    url: string;
    container: Element | ParentNode;
}
// partialloader
//
//




//
//
// asyncimageloader

export interface AsyncImageLoaderOptions {
  includePicture?: boolean;
}

export interface ISourceData {
  srcset: string;
  type: string;
  media: string;
}

export interface IImageMetadata {
  element: HTMLImageElement;
  src: string;
  alt: string;
  href: string | null;
  sources: ISourceData[];
}

export interface IImageLoadResult {
  element: HTMLImageElement;
  loaded: boolean;
}


// asyncimageloader
//
//



//
//
// InactivityWatcher

export interface IInactivityWatcherOptions {
  inactivityDelay?: number;
  target?: Document | HTMLElement | Window;
  debug?: boolean;
  events?: string[];
  throttleMs?: number;
  passive?: boolean;
  pauseOnHidden?: boolean;
  emitLeadingActive?: boolean;
}





//
// partialfetcher
export interface IPartialFetchOptions {
    replace?: boolean;
    signal?: AbortSignal;
    withBindings?: (binder: EventBinder) => void;
    debugBindings?: boolean;
}


//
// PerformanceMonitor
export interface IPerformanceSettings {
  maxImages: number;
  speedMultiplier: number;
  useSubpixel: boolean;
}
export type PerformanceLevel = 'high' | 'medium' | 'low';

