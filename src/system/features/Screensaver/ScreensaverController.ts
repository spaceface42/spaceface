// src/spaceface/features/Screensaver/ScreensaverController.ts

export const VERSION = '2.0.0' as const;

import { eventBus } from "../../bin/EventBus.js";
import { EventBinder } from "../../bin/EventBinder.js";
import { InactivityWatcher } from "../../bin/InactivityWatcher.js";
import { PartialFetcher } from "../../bin/PartialFetcher.js";
import { FloatingImagesManager } from "../FloatingImages/FloatingImagesManager.js";
import type { LogPayload } from "../../types/bin.js";

import type {
  ScreensaverControllerOptionsInterface,
  FloatingImagesManagerInterface
} from "../../types/features.js";

export class ScreensaverController {
  private readonly partialUrl: string;
  private readonly targetSelector: string;
  private readonly inactivityDelay: number;
  private readonly debug: boolean;
  private readonly onError?: (message: string, error: unknown) => void;

  private screensaverManager: FloatingImagesManagerInterface | null = null;
  private watcher: InactivityWatcher | null = null;
  private _destroyed = false;
  private eventBinder: EventBinder;
  private _partialLoaded = false;
  private partialFetcher: typeof PartialFetcher;
  // avoid duplicate concurrent partial loads
  private _loadPromise?: Promise<void>;
  private _hideTimeout: number | null = null;
  private _bound = false;

  private _onInactivity: () => void;
  private _onActivity: () => void;

  constructor(
    options: ScreensaverControllerOptionsInterface & {
      watcher?: InactivityWatcher;
      partialFetcher?: typeof PartialFetcher;
      debug?: boolean;
    }
  ) {
    this.partialUrl = options.partialUrl;
    this.targetSelector = options.targetSelector;
    this.inactivityDelay = options.inactivityDelay ?? 12000;
    this.debug = !!options.debug;

    this.watcher = options.watcher ?? null;
    this.partialFetcher = options.partialFetcher ?? PartialFetcher;
    this.onError = options.onError;

    this.eventBinder = new EventBinder(this.debug);
    this._onInactivity = this.showScreensaver.bind(this);
    this._onActivity = this.hideScreensaver.bind(this);

    this.log('info', 'ScreensaverController initialized', {
      partialUrl: this.partialUrl,
      targetSelector: this.targetSelector,
      inactivityDelay: this.inactivityDelay
    });
  }

  /** Centralized logging with debug and level support */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: unknown
  ) {
    if (!this.debug && level === 'debug') return;

    const payload: LogPayload = { scope: 'ScreensaverController', level, message, data, time: Date.now() };
    eventBus.emit("screensaver:log", { level, message, data });
    eventBus.emit("log", payload);

    if (this.debug) {
      const consoleMethodMap: Record<'debug' | 'info' | 'warn' | 'error', keyof Console> = {
        debug: 'debug',
        info: 'info',
        warn: 'warn',
        error: 'error'
      };
      const method = consoleMethodMap[level] ?? 'log';
      (console as any)[method](`[ScreensaverController] [${level.toUpperCase()}]`, message, data);
    }
  }

  async init(): Promise<void> {
    if (this._destroyed) return;
    if (this._bound) return;

    try {
      if (!this.watcher) {
        this.watcher = InactivityWatcher.getInstance({
          inactivityDelay: this.inactivityDelay
        });
      }

      this.eventBinder.bindBus("user:inactive", this._onInactivity);
      this.eventBinder.bindBus("user:active", this._onActivity);
      this._bound = true;

      this.log('info', 'Bound user inactivity/active events');
    } catch (error) {
      this.handleError('Failed to initialize inactivity watcher', error);
    }
  }

  async showScreensaver(): Promise<void> {
    if (this._destroyed) return;

    try {
      if (!this._partialLoaded) {
        if (!this._loadPromise) {
          this._loadPromise = this.partialFetcher
            .load(this.partialUrl, this.targetSelector)
            .then(() => { this._partialLoaded = true; })
            .finally(() => { this._loadPromise = undefined; });
        }
        await this._loadPromise;
      }

      const container = document.querySelector<HTMLElement>(this.targetSelector);
      if (!container) {
        this.handleError(`Target selector "${this.targetSelector}" not found`, null);
        return;
      }

      container.style.opacity = '0';
      container.style.display = '';
      void container.offsetWidth; // force reflow
      container.style.transition = 'opacity 0.5s ease';
      container.style.opacity = '1';

      if (!this.screensaverManager) {
        this.screensaverManager = new FloatingImagesManager(container, { debug: this.debug });
      } else {
        this.screensaverManager.destroy();
        this.screensaverManager = new FloatingImagesManager(container, { debug: this.debug });
      }

      eventBus.emit('screensaver:shown', { targetSelector: this.targetSelector });
      this.log('info', 'Screensaver displayed');
    } catch (error) {
      this.handleError('Failed to load or show screensaver', error);
    }
  }

  hideScreensaver(): void {
    if (this._destroyed) return;

    try {
      const container = document.querySelector<HTMLElement>(this.targetSelector);
      if (container) {
        container.style.transition = 'opacity 0.5s ease';
        container.style.opacity = '0';
        if (this._hideTimeout) {
          clearTimeout(this._hideTimeout);
        }
        this._hideTimeout = window.setTimeout(() => {
          container.style.display = 'none';
          this._hideTimeout = null;
        }, 500);
      }

      eventBus.emit('screensaver:hidden', { targetSelector: this.targetSelector });
      this.log('debug', 'Screensaver hidden');
    } catch (error) {
      this.handleError('Failed to hide screensaver', error);
    }
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this.hideScreensaver();
    try { this.screensaverManager?.destroy(); } catch (err) { this.log('warn', 'screensaverManager.destroy() failed', err); }
    this.eventBinder.unbindAll();
    this._partialLoaded = false;
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }
    // clear pending load ref to avoid holding Promise after destroy
    this._loadPromise = undefined;
    this._bound = false;

    this.log('info', 'ScreensaverController destroyed');
  }

  private handleError(message: string, error: unknown): void {
    eventBus.emit("screensaver:error", { message, error });
    this.onError?.(message, error);
    this.log('error', message, error);
  }
}
