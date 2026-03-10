// src/features/slideshow/SlideshowFeature.ts
import type { Feature } from "../../core/feature.js";
import { createEffect } from "../../core/signals.js";
import { screensaverActiveSignal } from "../shared/screensaverState.js";

export interface SlideshowFeatureOptions {
  autoplayMs?: number;
  prevSelector?: string;
  nextSelector?: string;
}

export class SlideshowFeature implements Feature {
  readonly name = "slideshow";
  static selector = "slideshow";

  private options: Required<SlideshowFeatureOptions>;
  private root: HTMLElement | null = null;
  private slides: HTMLElement[] = [];

  // State
  private index = 0;
  private autoplayTimer: number | null = null;
  private autoplayStartTime = 0;
  private autoplayRemainingMs = 0;
  private pausedByScreensaver = false;

  // Cleanup references
  private cleanupEffect?: () => void;
  private detachPrevClick?: () => void;
  private detachNextClick?: () => void;

  constructor(options: SlideshowFeatureOptions = {}) {
    this.options = {
      autoplayMs: options.autoplayMs ?? 5000,
      prevSelector: options.prevSelector ?? "[data-slide-prev]",
      nextSelector: options.nextSelector ?? "[data-slide-next]",
    };
    this.autoplayRemainingMs = this.options.autoplayMs;
  }

  mount(el: HTMLElement): void {
    this.root = el;
    this.slides = Array.from(this.root.querySelectorAll<HTMLElement>("[data-slide]"));

    // Attempt to resume from currently active slide if restoring from cache
    let activeIndex = this.slides.findIndex(s => s.getAttribute("aria-hidden") === "false");
    if (activeIndex === -1) {
      activeIndex = this.slides.findIndex(s => !s.hidden);
    }
    this.index = Math.max(0, activeIndex);

    this.render();
    this.bindControls();

    // Listen to screensaver state reactively
    this.cleanupEffect = createEffect(() => {
      const isScreensaverActive = screensaverActiveSignal.value;
      this.pausedByScreensaver = isScreensaverActive;
      this.updateAutoplayState();
    });
  }

  destroy(): void {
    this.clearAutoplay();
    this.cleanupEffect?.();
    this.cleanupEffect = undefined;

    this.detachPrevClick?.();
    this.detachNextClick?.();
    this.detachPrevClick = undefined;
    this.detachNextClick = undefined;

    this.root = null;
    this.slides = [];
    this.pausedByScreensaver = false;
    this.autoplayRemainingMs = this.options.autoplayMs;
  }

  private bindControls(): void {
    if (!this.root) return;

    const prevButton = this.root.querySelector<HTMLElement>(this.options.prevSelector);
    if (prevButton) {
      const onPrev = () => this.prev(true);
      prevButton.addEventListener("click", onPrev);
      this.detachPrevClick = () => prevButton.removeEventListener("click", onPrev);
    }

    const nextButton = this.root.querySelector<HTMLElement>(this.options.nextSelector);
    if (nextButton) {
      const onNext = () => this.next(true);
      nextButton.addEventListener("click", onNext);
      this.detachNextClick = () => nextButton.removeEventListener("click", onNext);
    }
  }

  private next(manual = false): void {
    if (this.slides.length === 0) return;
    this.index = (this.index + 1) % this.slides.length;
    this.render();
    if (manual) this.resetAutoplay();
  }

  private prev(manual = false): void {
    if (this.slides.length === 0) return;
    this.index = (this.index - 1 + this.slides.length) % this.slides.length;
    this.render();
    if (manual) this.resetAutoplay();
  }

  private render(): void {
    for (let i = 0; i < this.slides.length; i += 1) {
      const visible = i === this.index;
      this.slides[i].hidden = !visible;
      this.slides[i].setAttribute("aria-hidden", String(!visible));
    }
  }

  private scheduleNextAutoplay(waitMs: number): void {
    if (this.autoplayTimer !== null) {
      clearTimeout(this.autoplayTimer);
    }
    this.autoplayStartTime = Date.now();
    this.autoplayRemainingMs = waitMs;
    this.autoplayTimer = window.setTimeout(() => {
      this.next(false);
      this.scheduleNextAutoplay(this.options.autoplayMs);
    }, waitMs);
  }

  private resetAutoplay(): void {
    this.autoplayRemainingMs = this.options.autoplayMs;
    if (this.autoplayTimer !== null && !this.pausedByScreensaver) {
      this.scheduleNextAutoplay(this.options.autoplayMs);
    }
  }

  private updateAutoplayState(): void {
    if (this.options.autoplayMs <= 0) {
      this.clearAutoplay();
      return;
    }

    // If we're paused or don't have enough slides, stop the timer but save elapsed time
    if (!this.root || this.slides.length <= 1 || this.pausedByScreensaver) {
      if (this.autoplayTimer !== null) {
        const elapsed = Date.now() - this.autoplayStartTime;
        this.autoplayRemainingMs = Math.max(0, this.autoplayRemainingMs - elapsed);
        this.clearAutoplay();
      }
      return;
    }

    // Resume timer using remaining time
    if (this.autoplayTimer !== null) return;
    this.scheduleNextAutoplay(this.autoplayRemainingMs > 0 ? this.autoplayRemainingMs : this.options.autoplayMs);
  }

  private clearAutoplay(): void {
    if (this.autoplayTimer === null) return;
    clearTimeout(this.autoplayTimer);
    this.autoplayTimer = null;
  }
}
