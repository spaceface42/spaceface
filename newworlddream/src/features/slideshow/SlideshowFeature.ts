import type { Feature, StartupContext } from "../../core/lifecycle.js";
import type { UnsubscribeFn } from "../../core/events.js";

export class SlideshowFeature implements Feature {
  readonly name = "slideshow";
  private root: HTMLElement | null = null;
  private slides: HTMLElement[] = [];
  private index = 0;
  private unsubscribeNext?: UnsubscribeFn;
  private unsubscribePrev?: UnsubscribeFn;

  init(ctx: StartupContext): void {
    this.root = document.querySelector<HTMLElement>("[data-slideshow]");
    if (!this.root) {
      ctx.logger.debug("slideshow skipped: missing [data-slideshow]");
      return;
    }

    this.slides = Array.from(this.root.querySelectorAll<HTMLElement>("[data-slide]"));
    this.index = 0;
    this.render();

    this.unsubscribeNext = ctx.events.on("slideshow:next", () => this.next());
    this.unsubscribePrev = ctx.events.on("slideshow:prev", () => this.prev());

    ctx.logger.info("slideshow initialized", { slides: this.slides.length });
  }

  destroy(): void {
    this.unsubscribeNext?.();
    this.unsubscribePrev?.();
    this.unsubscribeNext = undefined;
    this.unsubscribePrev = undefined;
    this.root = null;
    this.slides = [];
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
}
