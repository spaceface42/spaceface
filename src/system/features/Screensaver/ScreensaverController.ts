// src/spaceface/features/Screensaver/ScreensaverController.ts
import { eventBus } from "../../bin/EventBus.js";
import { EventBinder } from "../../bin/EventBinder.js";
import { InactivityWatcher } from "../../bin/InactivityWatcher.js";
import { PartialFetcher } from "../../bin/PartialFetcher.js";
import { FloatingImagesManager } from "../FloatingImages/FloatingImagesManager.js";

import type {
  IScreensaverControllerOptions,
  IFloatingImagesManager
} from "../../types/features.js";

export class ScreensaverController {
  private readonly partialUrl: string;
  private readonly targetSelector: string;
  private readonly inactivityDelay: number;
  private screensaverManager: IFloatingImagesManager | null = null;
  private watcher: InactivityWatcher | null = null;
  private _destroyed = false;
  private eventBinder: EventBinder;
  private _partialLoaded = false;
  private partialFetcher: typeof PartialFetcher;

  private _onInactivity: () => void;
  private _onActivity: () => void;

  constructor(
    options: IScreensaverControllerOptions & {
      watcher?: InactivityWatcher;
      partialFetcher?: typeof PartialFetcher;
    }
  ) {
    this.partialUrl = options.partialUrl;
    this.targetSelector = options.targetSelector;
    this.inactivityDelay = options.inactivityDelay ?? 12000;

    this.watcher = options.watcher ?? null;
    this.partialFetcher = options.partialFetcher ?? PartialFetcher;

    this.eventBinder = new EventBinder(true);
    this._onInactivity = this.showScreensaver.bind(this);
    this._onActivity = this.hideScreensaver.bind(this);

    eventBus.emit("screensaver:log", {
      level: "info",
      message: "ScreensaverController initialized",
      details: {
        partialUrl: this.partialUrl,
        targetSelector: this.targetSelector,
        inactivityDelay: this.inactivityDelay
      }
    });
  }

  async init(): Promise<void> {
    if (this._destroyed) return;

    try {
      if (!this.watcher) {
        this.watcher = InactivityWatcher.getInstance({
          inactivityDelay: this.inactivityDelay
        });
      }

      this.eventBinder.bindBus("user:inactive", this._onInactivity);
      this.eventBinder.bindBus("user:active", this._onActivity);

      eventBus.emit("screensaver:log", {
        level: "info",
        message: "Bound user inactivity/active events"
      });
    } catch (error) {
      eventBus.emit("screensaver:error", {
        message: "Failed to initialize inactivity watcher",
        error
      });
    }
  }

  async showScreensaver(): Promise<void> {
    if (this._destroyed) return;

    try {
      if (!this._partialLoaded) {
        await this.partialFetcher.load(this.partialUrl, this.targetSelector);
        this._partialLoaded = true;
      }

      const container = document.querySelector<HTMLElement>(this.targetSelector);
      if (!container) {
        eventBus.emit("screensaver:error", {
          message: `Target selector "${this.targetSelector}" not found`
        });
        return;
      }

      container.style.opacity = "0";
      container.style.display = "";
      void container.offsetWidth; // force reflow
      container.style.transition = "opacity 0.5s ease";
      container.style.opacity = "1";

      if (!this.screensaverManager) {
        this.screensaverManager = new FloatingImagesManager(container, { debug: true });
      } else {
        this.screensaverManager.destroy();
        this.screensaverManager = new FloatingImagesManager(container, { debug: true });
      }

      eventBus.emit("screensaver:log", {
        level: "info",
        message: "Screensaver displayed"
      });
    } catch (error) {
      eventBus.emit("screensaver:error", {
        message: "Failed to load or show screensaver",
        error
      });
    }
  }

  hideScreensaver(): void {
    if (this._destroyed) return;

    try {
      const container = document.querySelector<HTMLElement>(this.targetSelector);
      if (container) {
        container.style.transition = "opacity 0.5s ease";
        container.style.opacity = "0";
        setTimeout(() => {
          container.style.display = "none";
        }, 500);
      }
    } catch (error) {
      eventBus.emit("screensaver:error", {
        message: "Failed to hide screensaver",
        error
      });
    }
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;

    this.hideScreensaver();
    this.screensaverManager?.destroy();
    this.eventBinder.unbindAll();
    this._partialLoaded = false;

    eventBus.emit("screensaver:log", {
      level: "info",
      message: "ScreensaverController destroyed"
    });
  }
}
