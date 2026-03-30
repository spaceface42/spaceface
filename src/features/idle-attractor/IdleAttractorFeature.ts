import type { Feature, FeatureMountContext } from "../../core/feature.js";
import { createLogger, type Logger } from "../../core/logger.js";
import { createEffect } from "../../core/signals.js";
import { loadPartialHtml } from "../../core/partials.js";
import { userActivitySignal } from "../shared/activity.js";
import { isManualIdleShortcut } from "../shared/manualIdleShortcut.js";

export interface IdleAttractorFeatureOptions {
  idleMs?: number;
  rotateMs?: number;
  partialUrl?: string;
  partialAssetAttributes?: string[];
}

export class IdleAttractorFeature implements Feature {
  private options: Required<IdleAttractorFeatureOptions>;
  private target: HTMLElement | null = null;
  private cleanupEffect?: () => void;
  private idleTimer: number | null = null;
  private rotationTimer: number | null = null;
  private hideCleanupTimer: number | null = null;
  private partialLoadController: AbortController | null = null;
  private partialLoaded = false;
  private isShowing = false;
  private activeLayoutIndex = 0;
  private showRequestId = 0;
  private logger: Logger = createLogger("idle-attractor", "warn");

  private readonly handleResize = (): void => {
    this.syncRuntimeText();
  };

  private readonly handleManualStartKeydown = (event: KeyboardEvent): void => {
    if (!this.target) return;
    if (this.isShowing) return;
    if (!isManualIdleShortcut(event)) return;

    event.preventDefault();
    const requestId = ++this.showRequestId;
    this.cancelPendingPartialLoad();
    this.resetIdleTimer();
    void this.showAttractor(requestId, "manual");
  };

  constructor(options: IdleAttractorFeatureOptions = {}) {
    this.options = {
      idleMs: options.idleMs ?? 120000,
      rotateMs: options.rotateMs ?? 2400,
      partialUrl: options.partialUrl ?? "",
      partialAssetAttributes: options.partialAssetAttributes ?? ["src", "poster", "data-src"],
    };
  }

  mount(el: HTMLElement, context?: FeatureMountContext): void {
    this.logger = context?.logger ?? this.logger;
    this.target = el;
    this.target.hidden = true;
    this.target.classList.remove("is-active");
    this.target.setAttribute("aria-hidden", "true");
    document.addEventListener("keydown", this.handleManualStartKeydown);
    window.addEventListener("resize", this.handleResize, { passive: true });

    this.cleanupEffect = createEffect(() => {
      void userActivitySignal.value;
      const requestId = ++this.showRequestId;
      this.cancelPendingPartialLoad();
      this.resetIdleTimer();

      if (this.isShowing) {
        this.hideAttractor();
      }

      this.idleTimer = window.setTimeout(() => {
        void this.showAttractor(requestId, "idle");
      }, this.options.idleMs);
    });
  }

  destroy(): void {
    this.showRequestId += 1;
    this.isShowing = false;
    this.partialLoaded = false;
    this.activeLayoutIndex = 0;
    this.cancelPendingPartialLoad();
    this.resetIdleTimer();
    this.stopRotation();
    this.cleanupEffect?.();
    this.cleanupEffect = undefined;
    document.removeEventListener("keydown", this.handleManualStartKeydown);
    window.removeEventListener("resize", this.handleResize);

    if (this.hideCleanupTimer !== null) {
      clearTimeout(this.hideCleanupTimer);
      this.hideCleanupTimer = null;
    }

    if (this.target) {
      this.clearPartialMount(this.target);
      this.target.classList.remove("is-active");
      this.target.hidden = true;
      this.target.setAttribute("aria-hidden", "true");
    }

    this.target = null;
  }

  private resetIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private stopRotation(): void {
    if (this.rotationTimer !== null) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  private async showAttractor(requestId: number, reason: "idle" | "manual"): Promise<void> {
    if (!this.target) return;
    if (requestId !== this.showRequestId) return;

    if (this.hideCleanupTimer !== null) {
      clearTimeout(this.hideCleanupTimer);
      this.hideCleanupTimer = null;
    }

    const ready = await this.prepareMarkup(this.target, requestId);
    if (!ready) return;
    if (requestId !== this.showRequestId || !this.target) return;

    this.syncRuntimeText();
    this.applyActiveLayout(0);
    this.isShowing = true;
    this.target.hidden = false;
    void this.target.offsetWidth;
    this.target.classList.add("is-active");
    this.target.setAttribute("aria-hidden", "false");
    this.startRotation();
    this.logger.debug("idle attractor started", { partialLoaded: this.partialLoaded, reason });
  }

  private hideAttractor(): void {
    if (!this.target || !this.isShowing) return;
    this.isShowing = false;
    this.stopRotation();
    this.logger.debug("idle attractor stopped", { reason: "activity" });

    this.target.classList.remove("is-active");
    this.target.setAttribute("aria-hidden", "true");

    const durationMs = this.getTransitionDurationMs(this.target);
    this.hideCleanupTimer = window.setTimeout(() => {
      if (!this.target || this.isShowing) return;
      this.target.hidden = true;
      this.applyActiveLayout(0);
    }, durationMs);
  }

  private startRotation(): void {
    this.stopRotation();
    const layouts = this.getLayouts();
    if (layouts.length <= 1 || prefersReducedMotion()) {
      this.applyActiveLayout(0);
      return;
    }

    this.rotationTimer = window.setInterval(() => {
      const nextIndex = (this.activeLayoutIndex + 1) % layouts.length;
      this.applyActiveLayout(nextIndex);
    }, this.options.rotateMs);
  }

  private applyActiveLayout(nextIndex: number): void {
    const layouts = this.getLayouts();
    if (layouts.length === 0) return;

    const normalizedIndex = ((nextIndex % layouts.length) + layouts.length) % layouts.length;
    this.activeLayoutIndex = normalizedIndex;

    for (const [index, layout] of layouts.entries()) {
      const isCurrent = index === normalizedIndex;
      layout.classList.toggle("is-current", isCurrent);
      layout.setAttribute("aria-hidden", isCurrent ? "false" : "true");
    }
  }

  private getLayouts(): HTMLElement[] {
    if (!this.target) return [];
    return Array.from(this.target.querySelectorAll<HTMLElement>("[data-idle-attractor-layout]"));
  }

  private syncRuntimeText(): void {
    if (!this.target) return;
    const width = this.target.querySelector<HTMLElement>("[data-idle-attractor-width]");
    const height = this.target.querySelector<HTMLElement>("[data-idle-attractor-height]");
    const year = this.target.querySelector<HTMLElement>("[data-idle-attractor-year]");
    if (width) width.textContent = String(window.innerWidth);
    if (height) height.textContent = String(window.innerHeight);
    if (year) year.textContent = String(new Date().getFullYear());
  }

  private async prepareMarkup(target: HTMLElement, requestId: number): Promise<boolean> {
    if (!this.options.partialUrl) {
      return false;
    }

    if (this.partialLoaded) {
      if (target.querySelector("[data-idle-attractor-partial]")) {
        return true;
      }
      this.partialLoaded = false;
    }

    try {
      const controller = new AbortController();
      this.partialLoadController = controller;
      const html = await loadPartialHtml(this.options.partialUrl, {
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
      this.syncRuntimeText();
      this.applyActiveLayout(0);
      return true;
    } catch (error) {
      if (isAbortError(error)) {
        return false;
      }
      this.logger.warn("failed to load idle attractor partial", {
        partialUrl: this.options.partialUrl,
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
    let mount = target.querySelector<HTMLElement>("[data-idle-attractor-partial]");
    if (mount) return mount;
    mount = document.createElement("div");
    mount.setAttribute("data-idle-attractor-partial", "true");
    target.prepend(mount);
    return mount;
  }

  private clearPartialMount(target: HTMLElement): void {
    const mount = target.querySelector<HTMLElement>("[data-idle-attractor-partial]");
    mount?.remove();
    this.partialLoaded = false;
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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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
