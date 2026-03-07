import type { Feature, StartupContext } from "../../core/lifecycle.js";
import type { UnsubscribeFn } from "../../core/events.js";
import { rebindOnRoute } from "../../core/rebindOnRoute.js";

export interface SlideshowFeatureOptions {
  autoplayMs?: number;
  pauseOnScreensaver?: boolean;
  prevSelector?: string;
  nextSelector?: string;
}

export class SlideshowFeature implements Feature {
  readonly name = "slideshow";
  readonly domBound = true;
  private readonly options: Required<SlideshowFeatureOptions>;
  private root: HTMLElement | null = null;
  private slides: HTMLElement[] = [];
  private index = 0;
  private autoplayTimer: number | null = null;
  private autoplayStartTime = 0;
  private autoplayRemainingMs = 0;
  private pausedByScreensaver = false;
  private unsubscribeNext?: UnsubscribeFn;
  private unsubscribePrev?: UnsubscribeFn;
  private unsubscribeScreensaverShown?: UnsubscribeFn;
  private unsubscribeScreensaverHidden?: UnsubscribeFn;
  private detachPrevClick?: () => void;
  private detachNextClick?: () => void;

  constructor(options: SlideshowFeatureOptions = {}) {
    this.options = {
      autoplayMs: options.autoplayMs ?? 5000,
      pauseOnScreensaver: options.pauseOnScreensaver ?? true,
      prevSelector: options.prevSelector ?? "[data-slide-prev]",
      nextSelector: options.nextSelector ?? "[data-slide-next]",
    };
    this.autoplayRemainingMs = this.options.autoplayMs;
  }

  init(ctx: StartupContext): void {
    this.root = document.querySelector<HTMLElement>("[data-slideshow]");
    if (!this.root) {
      ctx.logger.debug("slideshow skipped: missing [data-slideshow]");
      return;
    }

    this.slides = Array.from(this.root.querySelectorAll<HTMLElement>("[data-slide]"));

    // Attempt to resume from the currently active slide if restoring from cache
    let activeIndex = this.slides.findIndex(s => s.getAttribute("aria-hidden") === "false");
    if (activeIndex === -1) {
      activeIndex = this.slides.findIndex(s => !s.hidden);
    }
    this.index = Math.max(0, activeIndex);

    this.render();
    this.bindControls();

    this.autoplayRemainingMs = this.options.autoplayMs;

    this.unsubscribeNext = ctx.events.on("slideshow:next", () => this.next(true));
    this.unsubscribePrev = ctx.events.on("slideshow:prev", () => this.prev(true));
    if (this.options.pauseOnScreensaver) {
      this.unsubscribeScreensaverShown = ctx.events.on("screensaver:shown", () => {
        this.pausedByScreensaver = true;
        this.updateAutoplayState();
      });
      this.unsubscribeScreensaverHidden = ctx.events.on("screensaver:hidden", () => {
        this.pausedByScreensaver = false;
        this.updateAutoplayState();
      });
    }
    this.updateAutoplayState();

    ctx.logger.info("slideshow initialized", {
      slides: this.slides.length,
      autoplayMs: this.options.autoplayMs,
    });
  }

  destroy(): void {
    this.clearAutoplay();
    this.unsubscribeNext?.();
    this.unsubscribePrev?.();
    this.unsubscribeScreensaverShown?.();
    this.unsubscribeScreensaverHidden?.();
    this.unsubscribeNext = undefined;
    this.unsubscribePrev = undefined;
    this.unsubscribeScreensaverShown = undefined;
    this.unsubscribeScreensaverHidden = undefined;
    this.detachPrevClick?.();
    this.detachNextClick?.();
    this.detachPrevClick = undefined;
    this.detachNextClick = undefined;
    this.root = null;
    this.slides = [];
    this.pausedByScreensaver = false;
    this.autoplayRemainingMs = this.options.autoplayMs;
  }

  onRouteChange(_nextRoute: string, ctx: StartupContext): void {
    this.root = rebindOnRoute<HTMLElement>({
      getNextBinding: () => document.querySelector<HTMLElement>("[data-slideshow]"),
      currentBinding: this.root,
      hasActiveState: this.slides.length > 0,
      onInit: () => this.init(ctx),
      onDestroy: () => this.destroy(),
    });
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
