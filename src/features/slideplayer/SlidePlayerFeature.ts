import type { Feature } from "../../core/feature.js";
import { createEffect } from "../../core/signals.js";
import { screensaverActiveSignal } from "../shared/screensaverState.js";

export interface SlidePlayerFeatureOptions {
  autoplayMs?: number;
  slideSelector?: string;
  prevSelector?: string;
  nextSelector?: string;
  bulletsSelector?: string;
  bulletSelector?: string;
  activeClass?: string;
}

export class SlidePlayerFeature implements Feature {
  readonly name = "slideplayer";
  static selector = "slideplayer";

  private options: Required<SlidePlayerFeatureOptions>;
  private root: HTMLElement | null = null;
  private slides: HTMLElement[] = [];
  private bullets: HTMLButtonElement[] = [];
  private index = 0;
  private autoplayTimer: number | null = null;
  private autoplayStartTime = 0;
  private autoplayRemainingMs = 0;
  private pausedByScreensaver = false;
  private cleanupEffect?: () => void;
  private detachPrevClick?: () => void;
  private detachNextClick?: () => void;
  private detachBulletClicks: Array<() => void> = [];

  constructor(options: SlidePlayerFeatureOptions = {}) {
    this.options = {
      autoplayMs: options.autoplayMs ?? 5000,
      slideSelector: options.slideSelector ?? "[data-slideplayer-slide]",
      prevSelector: options.prevSelector ?? "[data-slideplayer-prev]",
      nextSelector: options.nextSelector ?? "[data-slideplayer-next]",
      bulletsSelector: options.bulletsSelector ?? "[data-slideplayer-bullets]",
      bulletSelector: options.bulletSelector ?? "[data-slideplayer-bullet]",
      activeClass: options.activeClass ?? "active",
    };
    this.autoplayRemainingMs = this.options.autoplayMs;
  }

  mount(el: HTMLElement): void {
    this.root = el;
    this.slides = Array.from(this.root.querySelectorAll<HTMLElement>(this.options.slideSelector));
    this.bullets = this.collectBullets();
    this.index = this.readInitialIndex();

    this.render();
    this.bindControls();

    this.cleanupEffect = createEffect(() => {
      this.pausedByScreensaver = screensaverActiveSignal.value;
      this.updateAutoplayState();
    });
  }

  destroy(): void {
    this.clearAutoplay();
    this.cleanupEffect?.();
    this.cleanupEffect = undefined;
    this.detachPrevClick?.();
    this.detachPrevClick = undefined;
    this.detachNextClick?.();
    this.detachNextClick = undefined;

    for (const detach of this.detachBulletClicks) {
      detach();
    }
    this.detachBulletClicks = [];

    this.root = null;
    this.slides = [];
    this.bullets = [];
    this.index = 0;
    this.pausedByScreensaver = false;
    this.autoplayRemainingMs = this.options.autoplayMs;
  }

  private collectBullets(): HTMLButtonElement[] {
    if (!this.root) return [];
    const bulletsRoot = this.root.querySelector<HTMLElement>(this.options.bulletsSelector);
    if (!bulletsRoot) return [];
    return Array.from(bulletsRoot.querySelectorAll<HTMLButtonElement>(this.options.bulletSelector));
  }

  private readInitialIndex(): number {
    const activeIndex = this.slides.findIndex((slide) => slide.getAttribute("aria-hidden") === "false");
    if (activeIndex !== -1) return activeIndex;

    const visibleIndex = this.slides.findIndex((slide) => !slide.hidden);
    return Math.max(0, visibleIndex);
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

    this.detachBulletClicks = this.bullets.map((button, index) => {
      const onClick = () => this.goTo(index, true);
      button.addEventListener("click", onClick);
      return () => button.removeEventListener("click", onClick);
    });
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

  private goTo(index: number, manual = false): void {
    if (this.slides.length === 0) return;
    this.index = Math.max(0, Math.min(index, this.slides.length - 1));
    this.render();
    if (manual) this.resetAutoplay();
  }

  private render(): void {
    for (let i = 0; i < this.slides.length; i += 1) {
      const isActive = i === this.index;
      const slide = this.slides[i];
      slide.hidden = !isActive;
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.classList.toggle("is-active", isActive);
    }

    for (let i = 0; i < this.bullets.length; i += 1) {
      const isActive = i === this.index;
      const bullet = this.bullets[i];
      bullet.classList.toggle(this.options.activeClass, isActive);
      bullet.setAttribute("aria-current", isActive ? "true" : "false");
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

    if (!this.root || this.slides.length <= 1 || this.pausedByScreensaver) {
      if (this.autoplayTimer !== null) {
        const elapsed = Date.now() - this.autoplayStartTime;
        this.autoplayRemainingMs = Math.max(0, this.autoplayRemainingMs - elapsed);
        this.clearAutoplay();
      }
      return;
    }

    if (this.autoplayTimer !== null) return;
    this.scheduleNextAutoplay(this.autoplayRemainingMs > 0 ? this.autoplayRemainingMs : this.options.autoplayMs);
  }

  private clearAutoplay(): void {
    if (this.autoplayTimer === null) return;
    clearTimeout(this.autoplayTimer);
    this.autoplayTimer = null;
  }
}
