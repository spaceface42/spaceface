// src/features/screensaver/ScreensaverFeature.ts
import type { Feature } from "../../core/feature.js";
import { createEffect } from "../../core/signals.js";
import { userActivitySignal } from "../shared/activity.js";
import { screensaverActiveSignal } from "../shared/screensaverState.js";
import { loadPartialHtml } from "../../core/partials.js";
// We don't import or tightly couple to FloatingImagesFeature directly in the code logic.
// Instead, we just write the HTML. The FeatureRegistry will automatically see it
// and spawn a FloatingImagesFeature for us! This is the core magic of vNext.

export interface ScreensaverFeatureOptions {
  idleMs?: number;
  partialUrl?: string;
}

export class ScreensaverFeature implements Feature {
  readonly name = "screensaver";
  static selector = "screensaver";

  private options: Required<ScreensaverFeatureOptions>;
  private target: HTMLElement | null = null;
  private cleanupEffect?: () => void;
  private timer: number | null = null;
  private isShowing = false;
  private partialLoaded = false;

  // For cleanup timings
  private hideCleanupTimer: number | null = null;

  constructor(options: ScreensaverFeatureOptions = {}) {
    this.options = {
      idleMs: options.idleMs ?? 60000,
      partialUrl: options.partialUrl ?? "",
    };
  }

  mount(el: HTMLElement): void {
    this.target = el;
    this.target.hidden = true;
    this.target.classList.remove("is-active");
    this.target.setAttribute("aria-hidden", "true");

    // Start watching user activity via our shiny new Signal primitive
    this.cleanupEffect = createEffect(() => {
      const lastActive = userActivitySignal.value;
      this.resetTimer();

      if (this.isShowing) {
        this.hideScreensaver();
      }

      this.timer = window.setTimeout(() => {
        this.showScreensaver();
      }, this.options.idleMs);
    });
  }

  destroy(): void {
    this.isShowing = false;
    this.partialLoaded = false;
    this.resetTimer();
    this.cleanupEffect?.();
    this.cleanupEffect = undefined;

    if (this.hideCleanupTimer !== null) {
      clearTimeout(this.hideCleanupTimer);
      this.hideCleanupTimer = null;
    }

    if (this.target) {
      this.target.classList.remove("is-active");
      this.target.hidden = true;
      this.target.setAttribute("aria-hidden", "true");
      screensaverActiveSignal.value = false;
      // The FeatureRegistry takes care of destroying child features automatically
      // if we remove them from the DOM, but for fade-outs, we just hide them.
    }

    this.target = null;
  }

  private resetTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async showScreensaver(): Promise<void> {
    if (!this.target) return;
    this.isShowing = true;
    screensaverActiveSignal.value = true;

    if (this.hideCleanupTimer !== null) {
      clearTimeout(this.hideCleanupTimer);
      this.hideCleanupTimer = null;
    }

    await this.prepareScreensaverMarkup(this.target);

    // Check if we became active again during the async fetch
    if (!this.isShowing || !this.target) return;

    this.target.hidden = false;
    // We force a reflow before adding the active class so the fade-in CSS transitions trigger
    void this.target.offsetWidth;
    this.target.classList.add("is-active");
    this.target.setAttribute("aria-hidden", "false");

    // vNext Magic: We don't have to manually new FloatingImagesFeature().
    // By loading the partial containing `data-feature="floating-images"`, the
    // central MutationObserver completely handles instantiating those for us.
  }

  private hideScreensaver(): void {
    if (!this.target || !this.isShowing) return;
    this.isShowing = false;
    screensaverActiveSignal.value = false;

    this.target.classList.remove("is-active");
    this.target.setAttribute("aria-hidden", "true");

    // Wait for fade out animation before stopping the floating elements
    const durationMs = this.getTransitionDurationMs(this.target);
    this.hideCleanupTimer = window.setTimeout(() => {
      if (!this.target || this.isShowing) return;
      this.target.hidden = true;

      // We can drop the floating images from the DOM entirely to destroy them
      const floatingRoot = this.target.querySelector('[data-feature="floating-images"]');
      if (floatingRoot) {
        floatingRoot.remove();
        // The MutationObserver will instantly see this removal and call `destroy()`
        // on the FloatingImagesFeature instance gracefully!
      }
      this.partialLoaded = false;
    }, durationMs);
  }

  private async prepareScreensaverMarkup(target: HTMLElement): Promise<void> {
    if (!this.options.partialUrl || this.partialLoaded) return;

    try {
      const html = await loadPartialHtml(this.options.partialUrl, { cache: true });
      if (!this.isShowing || !this.target || this.target !== target) return;

      const mount = this.getOrCreatePartialMount(target);

      // Modifying innerHTML triggers the global FeatureRegistry's MutationObserver.
      // If the HTML contains `<div data-feature="floating-images"></div>`, it
      // will instantly instantiate a FloatingImagesFeature.
      mount.innerHTML = html;

      this.partialLoaded = true;
    } catch {
      // Keep screensaver behavior resilient if the partial cannot be loaded.
    }
  }

  private getOrCreatePartialMount(target: HTMLElement): HTMLElement {
    let mount = target.querySelector<HTMLElement>("[data-screensaver-partial]");
    if (mount) return mount;
    mount = document.createElement("div");
    mount.setAttribute("data-screensaver-partial", "true");
    target.prepend(mount);
    return mount;
  }

  private getTransitionDurationMs(element: HTMLElement): number {
    if (typeof window === "undefined") return 360;
    const style = window.getComputedStyle(element);
    const duration = style.transitionDuration;
    if (!duration) return 360;

    const maxDelay = Math.max(...duration.split(",").map((s) => parseFloat(s) * (s.includes("ms") ? 1 : 1000)));
    return isNaN(maxDelay) ? 360 : maxDelay;
  }
}
