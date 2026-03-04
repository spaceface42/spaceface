import type { Feature, StartupContext } from "../../core/lifecycle.js";
import type { UnsubscribeFn } from "../../core/events.js";

export interface SlideshowFeatureOptions {
  autoplayMs?: number;
  pauseOnScreensaver?: boolean;
  prevSelector?: string;
  nextSelector?: string;
}

export class SlideshowFeature implements Feature {
  readonly name = "slideshow";
  private readonly options: Required<SlideshowFeatureOptions>;
  private root: HTMLElement | null = null;
  private slides: HTMLElement[] = [];
  private index = 0;
  private autoplayTimer: number | null = null;
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
  }

  init(ctx: StartupContext): void {
    this.root = document.querySelector<HTMLElement>("[data-slideshow]");
    if (!this.root) {
      ctx.logger.debug("slideshow skipped: missing [data-slideshow]");
      return;
    }

    this.slides = Array.from(this.root.querySelectorAll<HTMLElement>("[data-slide]"));
    this.index = 0;
    this.render();
    this.bindControls();

    this.unsubscribeNext = ctx.events.on("slideshow:next", () => this.next());
    this.unsubscribePrev = ctx.events.on("slideshow:prev", () => this.prev());
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
  }

  private bindControls(): void {
    if (!this.root) return;

    const prevButton = this.root.querySelector<HTMLElement>(this.options.prevSelector);
    if (prevButton) {
      const onPrev = () => this.prev();
      prevButton.addEventListener("click", onPrev);
      this.detachPrevClick = () => prevButton.removeEventListener("click", onPrev);
    }

    const nextButton = this.root.querySelector<HTMLElement>(this.options.nextSelector);
    if (nextButton) {
      const onNext = () => this.next();
      nextButton.addEventListener("click", onNext);
      this.detachNextClick = () => nextButton.removeEventListener("click", onNext);
    }
  }

  private next(): void {
    if (this.slides.length === 0) return;
    this.index = (this.index + 1) % this.slides.length;
    this.render();
  }

  private prev(): void {
    if (this.slides.length === 0) return;
    this.index = (this.index - 1 + this.slides.length) % this.slides.length;
    this.render();
  }

  private render(): void {
    for (let i = 0; i < this.slides.length; i += 1) {
      const visible = i === this.index;
      this.slides[i].hidden = !visible;
      this.slides[i].setAttribute("aria-hidden", String(!visible));
    }
  }

  private updateAutoplayState(): void {
    if (this.options.autoplayMs <= 0) {
      this.clearAutoplay();
      return;
    }
    if (!this.root || this.slides.length <= 1 || this.pausedByScreensaver) {
      this.clearAutoplay();
      return;
    }
    if (this.autoplayTimer !== null) return;
    this.autoplayTimer = window.setInterval(() => {
      this.next();
    }, this.options.autoplayMs);
  }

  private clearAutoplay(): void {
    if (this.autoplayTimer === null) return;
    clearInterval(this.autoplayTimer);
    this.autoplayTimer = null;
  }
}
