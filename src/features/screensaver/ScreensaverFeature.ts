// src/features/screensaver/ScreensaverFeature.ts
import type { Feature, FeatureMountContext } from "../../core/feature.js";
import { createLogger, type Logger } from "../../core/logger.js";
import { createEffect } from "../../core/signals.js";
import { loadPartialHtml } from "../../core/partials.js";
import { userActivitySignal } from "../shared/activity.js";
import { isManualIdleShortcut } from "../shared/manualIdleShortcut.js";
import { screensaverActiveSignal } from "../shared/screensaverState.js";

export interface ScreensaverFeatureOptions {
  idleMs?: number;
  defaultScene?: string;
  scenePartialUrls?: Record<string, string>;
  partialAssetAttributes?: string[];
}

export class ScreensaverFeature implements Feature {
  private static activeInstance: ScreensaverFeature | null = null;

  private options: Required<ScreensaverFeatureOptions>;
  private target: HTMLElement | null = null;
  private cleanupEffect?: () => void;
  private timer: number | null = null;
  private isShowing = false;
  private partialLoaded = false;
  private loadedSceneId: string | null = null;
  private hideCleanupTimer: number | null = null;
  private showRequestId = 0;
  private partialLoadController: AbortController | null = null;
  private injectedSceneAttribute = false;
  private injectedSceneValue: string | null = null;
  private logger: Logger = createLogger("screensaver", "warn");
  private ownsSingleton = false;

  private readonly handleManualStartKeydown = (event: KeyboardEvent): void => {
    if (!this.target) return;
    if (this.isShowing) return;
    if (!isManualIdleShortcut(event)) return;

    event.preventDefault();
    const requestId = ++this.showRequestId;
    this.cancelPendingPartialLoad();
    this.resetTimer();
    void this.showScreensaver(requestId, "manual");
  };

  constructor(options: ScreensaverFeatureOptions = {}) {
    this.options = {
      idleMs: options.idleMs ?? 60000,
      defaultScene: options.defaultScene ?? "floating-images",
      scenePartialUrls: options.scenePartialUrls ?? {},
      partialAssetAttributes: options.partialAssetAttributes ?? ["src", "poster", "data-src"],
    };
  }

  mount(el: HTMLElement, context?: FeatureMountContext): void {
    this.logger = context?.logger ?? this.logger;
    this.target = el;
    this.target.hidden = true;
    this.target.classList.remove("is-active");
    this.target.setAttribute("aria-hidden", "true");

    if (ScreensaverFeature.activeInstance && ScreensaverFeature.activeInstance !== this) {
      this.logger.warn("ignored duplicate screensaver mount", {
        reason: "singleton-enforced",
      });
      return;
    }

    ScreensaverFeature.activeInstance = this;
    this.ownsSingleton = true;
    this.resolveSceneId(this.target);
    document.addEventListener("keydown", this.handleManualStartKeydown);

    this.cleanupEffect = createEffect(() => {
      const target = this.target;
      if (!target) return;
      void userActivitySignal.value;
      const requestId = ++this.showRequestId;
      this.cancelPendingPartialLoad();
      this.resetTimer();

      if (this.isShowing) {
        this.hideScreensaver();
      }

      this.timer = window.setTimeout(() => {
        void this.showScreensaver(requestId, "idle");
      }, this.resolveIdleMs(target));
    });
  }

  destroy(): void {
    if (this.isShowing) {
      this.logger.debug("screensaver stopped", { reason: "destroy" });
    }
    this.isShowing = false;
    this.showRequestId += 1;
    this.cancelPendingPartialLoad();
    this.resetTimer();
    this.cleanupEffect?.();
    this.cleanupEffect = undefined;

    if (this.hideCleanupTimer !== null) {
      clearTimeout(this.hideCleanupTimer);
      this.hideCleanupTimer = null;
    }
    document.removeEventListener("keydown", this.handleManualStartKeydown);

    if (this.target) {
      this.clearPartialMount(this.target);
      this.restoreInjectedSceneAttribute(this.target);
      this.target.classList.remove("is-active");
      this.target.hidden = true;
      this.target.setAttribute("aria-hidden", "true");
      if (this.ownsSingleton) {
        screensaverActiveSignal.value = false;
      }
    }

    this.target = null;
    if (this.ownsSingleton && ScreensaverFeature.activeInstance === this) {
      ScreensaverFeature.activeInstance = null;
    }
    this.ownsSingleton = false;
  }

  private resetTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async showScreensaver(requestId: number, reason: "idle" | "manual"): Promise<void> {
    if (!this.target) return;
    if (requestId !== this.showRequestId) return;

    if (this.hideCleanupTimer !== null) {
      clearTimeout(this.hideCleanupTimer);
      this.hideCleanupTimer = null;
    }

    const ready = await this.prepareScreensaverMarkup(this.target, requestId);
    if (!ready) return;

    // Check if we became active again during the async fetch
    if (requestId !== this.showRequestId || !this.target) return;

    this.isShowing = true;
    screensaverActiveSignal.value = true;
    this.target.hidden = false;
    void this.target.offsetWidth;
    this.target.classList.add("is-active");
    this.target.setAttribute("aria-hidden", "false");
    this.logger.debug("screensaver started", {
      partialLoaded: this.partialLoaded,
      reason,
      scene: this.loadedSceneId,
    });
  }

  private hideScreensaver(): void {
    if (!this.target || !this.isShowing) return;
    this.isShowing = false;
    this.logger.debug("screensaver stopped", {
      reason: "activity",
      scene: this.loadedSceneId,
    });

    this.target.classList.remove("is-active");
    this.target.setAttribute("aria-hidden", "true");

    const durationMs = this.getTransitionDurationMs(this.target);
    this.hideCleanupTimer = window.setTimeout(() => {
      if (!this.target || this.isShowing) return;
      this.target.hidden = true;
      screensaverActiveSignal.value = false;
    }, durationMs);
  }

  private async prepareScreensaverMarkup(target: HTMLElement, requestId: number): Promise<boolean> {
    const sceneId = this.resolveSceneId(target);
    if (!sceneId) {
      return false;
    }

    const partialUrl = this.options.scenePartialUrls[sceneId];
    if (!partialUrl) {
      this.logger.warn("missing screensaver scene partial", { scene: sceneId });
      return false;
    }

    if (this.partialLoaded && this.loadedSceneId === sceneId) {
      if (target.querySelector("[data-screensaver-partial]")) {
        return true;
      }
      this.partialLoaded = false;
      this.loadedSceneId = null;
    }

    try {
      const controller = new AbortController();
      this.partialLoadController = controller;
      const html = await loadPartialHtml(partialUrl, {
        cache: true,
        signal: controller.signal,
        assetAttributes: this.options.partialAssetAttributes,
      });
      if (requestId !== this.showRequestId || !this.target || this.target !== target) {
        return false;
      }

      const mount = this.getOrCreatePartialMount(target);
      mount.innerHTML = html;

      this.partialLoaded = true;
      this.loadedSceneId = sceneId;
      return true;
    } catch (error) {
      if (isAbortError(error)) {
        return false;
      }
      this.logger.warn("failed to load screensaver scene partial", {
        scene: sceneId,
        partialUrl,
        error,
      });
      return false;
    } finally {
      this.partialLoadController = null;
    }
  }

  private cancelPendingPartialLoad(): void {
    this.partialLoadController?.abort();
    this.partialLoadController = null;
  }

  private getOrCreatePartialMount(target: HTMLElement): HTMLElement {
    let mount = target.querySelector<HTMLElement>("[data-screensaver-partial]");
    if (mount) return mount;
    mount = document.createElement("div");
    mount.setAttribute("data-screensaver-partial", "true");
    target.prepend(mount);
    return mount;
  }

  private resolveIdleMs(target: HTMLElement): number {
    const configured = Number.parseInt(target.getAttribute("data-screensaver-idle-ms") ?? "", 10);
    if (Number.isFinite(configured) && configured >= 0) {
      return configured;
    }
    return this.options.idleMs;
  }

  private resolveSceneId(target: HTMLElement): string | null {
    const hasSceneAttribute = target.getAttribute("data-screensaver-scene") !== null;
    const authoredScene = target.getAttribute("data-screensaver-scene")?.trim();
    const fallbackScene = this.options.defaultScene || (Object.keys(this.options.scenePartialUrls)[0] ?? "");
    const sceneId = authoredScene || fallbackScene;
    if (!sceneId) {
      return null;
    }

    if (!hasSceneAttribute || !authoredScene) {
      target.setAttribute("data-screensaver-scene", sceneId);
      this.injectedSceneAttribute = true;
      this.injectedSceneValue = sceneId;
    } else if (this.injectedSceneAttribute && authoredScene === this.injectedSceneValue) {
      return authoredScene;
    } else {
      this.injectedSceneAttribute = false;
      this.injectedSceneValue = null;
    }

    return sceneId;
  }

  private restoreInjectedSceneAttribute(target: HTMLElement): void {
    if (this.injectedSceneAttribute && target.getAttribute("data-screensaver-scene") === this.injectedSceneValue) {
      target.removeAttribute("data-screensaver-scene");
    }
    this.injectedSceneAttribute = false;
    this.injectedSceneValue = null;
  }

  private clearPartialMount(target: HTMLElement): void {
    const mount = target.querySelector<HTMLElement>("[data-screensaver-partial]");
    mount?.remove();
    this.partialLoaded = false;
    this.loadedSceneId = null;
  }

  private getTransitionDurationMs(element: HTMLElement): number {
    if (typeof window === "undefined") return 360;
    const style = window.getComputedStyle(element);
    const durations = parseTransitionTimeList(style.transitionDuration);
    if (durations.length === 0) return 360;

    const delays = parseTransitionTimeList(style.transitionDelay);
    const count = Math.max(durations.length, delays.length, 1);
    let maxTotal = 0;

    for (let i = 0; i < count; i += 1) {
      const duration = durations[i % durations.length] ?? 0;
      const delay = delays.length > 0 ? (delays[i % delays.length] ?? 0) : 0;
      maxTotal = Math.max(maxTotal, duration + delay);
    }

    return Number.isFinite(maxTotal) ? maxTotal : 360;
  }
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function parseTransitionTimeList(value: string): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => parseTransitionTimeMs(entry.trim()))
    .filter((entry) => Number.isFinite(entry));
}

function parseTransitionTimeMs(value: string): number {
  if (!value) return Number.NaN;
  const numericValue = Number.parseFloat(value);
  if (Number.isNaN(numericValue)) return Number.NaN;
  return value.endsWith("ms") ? numericValue : numericValue * 1000;
}
