// src/spaceface/system/types/bin.ts

// domready
export type WaitForElementOptions = {
  timeout?: number;
  root?: ParentNode;
  signal?: AbortSignal;
};

// EventBinder
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

export interface EventBinderInterface {
  bindBus(event: string, handler: (...args: unknown[]) => void): void;
  bindDOM(
    target: EventTarget,
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: AddEventListenerOptions | boolean
  ): void;
  unbindAll(): void;
  getStats(): EventBinderStats;
  hasBindings(): boolean;
}

// EventBus
export type UnsubscribeFn = () => void;

export interface BusBindingInterface {
  event: string;
  handler: (...args: unknown[]) => void;
  unsubscribe: UnsubscribeFn;
}

export interface ListenerInterface {
  fn: (...args: unknown[]) => unknown;
  priority: number;
}

export interface AnyListenerInterface {
  fn: (...args: unknown[]) => unknown;
  priority: number;
}

export interface EventBusInterface<TEvents extends Record<string, unknown> = Record<string, unknown>> {
  on<K extends keyof TEvents>(event: K, fn: (payload: TEvents[K]) => unknown, priority?: number): UnsubscribeFn;
  on<T = unknown>(event: string, fn: (payload: T) => unknown, priority?: number): UnsubscribeFn;
  once<K extends keyof TEvents>(event: K, fn: (payload: TEvents[K]) => unknown, priority?: number): UnsubscribeFn;
  once<T = unknown>(event: string, fn: (payload: T) => unknown, priority?: number): UnsubscribeFn;
  onAny(fn: (event: keyof TEvents & string, payload: TEvents[keyof TEvents]) => unknown, priority?: number): UnsubscribeFn;
  off(event: string, fn: (...args: unknown[]) => unknown): void;
  offAny(fn: (...args: unknown[]) => unknown): void;
  emit<K extends keyof TEvents>(event: K, payload?: TEvents[K]): void;
  emit<T = unknown>(event: string, payload?: T): void;
  emitAsync<K extends keyof TEvents>(event: K, payload?: TEvents[K]): Promise<unknown[]>;
  emitAsync<T = unknown>(event: string, payload?: T): Promise<unknown[]>;
  removeAllListeners(event?: string): void;
  hasListeners(event: string): boolean;
  listenerCount(event: string): number;
  eventNames(): string[];
  getListeners(event: string): Array<(...args: unknown[]) => unknown>;
}

// Logging
export interface LogPayload {
  scope: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'event';
  message: string;
  data?: unknown;
  time?: number;
}

// partialloader
export interface PartialLoaderOptionsInterface {
  debug?: boolean;
  baseUrl?: string;
  cacheEnabled?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export interface PartialLoadResultInterface {
  success: boolean;
  url: string;
  cached: boolean;
}

export interface PartialInfoInterface {
  id?: string;
  url: string;
  container: Element | ParentNode;
}

// PartialFetcher
export interface PartialLoaderLike {
  load(
    input: HTMLLinkElement | PartialInfoInterface | (HTMLLinkElement | PartialInfoInterface)[]
  ): Promise<PartialLoadResultInterface[]>;
  loadContainer?(container?: ParentNode): Promise<PartialLoadResultInterface[]>;
  watch?(container: HTMLElement | Document): MutationObserver | void;
  isPartialLoaded?(id: string): boolean;
}

export interface PartialFetchOptionsInterface {
  /**
   * Optional reference to a PartialLoader instance to use caching and retry logic.
   * Should implement `PartialLoaderLike`.
   */
  loader?: PartialLoaderLike;
}

/**
 * Payload structure for PartialFetcher/PartialLoader events
 */
export interface PartialEventPayload {
  url: string;
  targetSelector?: string;
  html?: string;
  cached?: boolean;
  error?: unknown;
}

// asyncimageloader
export interface AsyncImageLoaderOptions {
  includePicture?: boolean;
  debug?: boolean;
}

export interface SourceDataInterface {
  srcset: string;
  type: string;
  media: string;
}

export interface ImageMetadataInterface {
  element: HTMLImageElement;
  src: string;
  alt: string;
  href: string | null;
  sources: SourceDataInterface[];
}

export interface ImageLoadResultInterface {
  element: HTMLImageElement;
  loaded: boolean;
}

// InactivityWatcher
export interface InactivityWatcherOptionsInterface {
  inactivityDelay: number;
  target?: EventTarget;
  debug?: boolean;
}

// PerformanceMonitor
export interface PerformanceSettingsInterface {
  maxImages: number;
  speedMultiplier: number;
  useSubpixel: boolean;
}

export type PerformanceLevel = 'high' | 'medium' | 'low';
