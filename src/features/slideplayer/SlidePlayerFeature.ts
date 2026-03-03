import type { Feature, StartupContext } from "../../core/lifecycle.js";
import type { UnsubscribeFn } from "../../core/events.js";

interface PlayerState {
  root: HTMLElement;
  slides: HTMLElement[];
  index: number;
  autoplayTimer: number | null;
  detachControls: Array<() => void>;
}

export interface SlidePlayerFeatureOptions {
  rootSelector?: string;
  slideSelector?: string;
  prevSelector?: string;
  nextSelector?: string;
  autoplayMs?: number;
  pauseOnScreensaver?: boolean;
}

export class SlidePlayerFeature implements Feature {
  readonly name = "slideplayer";

  private readonly options: Required<SlidePlayerFeatureOptions>;
  private players: PlayerState[] = [];
  private pausedByScreensaver = false;
  private unsubscribeScreensaverShown?: UnsubscribeFn;
  private unsubscribeScreensaverHidden?: UnsubscribeFn;

  constructor(options: SlidePlayerFeatureOptions = {}) {
    this.options = {
      rootSelector: options.rootSelector ?? "[data-slideplayer]",
      slideSelector: options.slideSelector ?? "[data-slideplayer-image]",
      prevSelector: options.prevSelector ?? "[data-slideplayer-prev]",
      nextSelector: options.nextSelector ?? "[data-slideplayer-next]",
      autoplayMs: options.autoplayMs ?? 5000,
      pauseOnScreensaver: options.pauseOnScreensaver ?? true,
    };
  }

  init(ctx: StartupContext): void {
    const roots = Array.from(document.querySelectorAll<HTMLElement>(this.options.rootSelector));
    if (roots.length === 0) {
      ctx.logger.debug("slideplayer skipped: missing containers", { selector: this.options.rootSelector });
      return;
    }

    this.players = roots
      .map((root) => this.createPlayer(root))
      .filter((player): player is PlayerState => Boolean(player));

    if (this.options.pauseOnScreensaver) {
      this.unsubscribeScreensaverShown = ctx.events.on("screensaver:shown", () => {
        this.pausedByScreensaver = true;
        this.updateAutoplay();
      });
      this.unsubscribeScreensaverHidden = ctx.events.on("screensaver:hidden", () => {
        this.pausedByScreensaver = false;
        this.updateAutoplay();
      });
    }

    this.updateAutoplay();
    ctx.logger.info("slideplayer initialized", {
      players: this.players.length,
      selector: this.options.rootSelector,
      autoplayMs: this.options.autoplayMs,
    });
  }

  destroy(): void {
    this.clearAutoplay();
    this.unsubscribeScreensaverShown?.();
    this.unsubscribeScreensaverHidden?.();
    this.unsubscribeScreensaverShown = undefined;
    this.unsubscribeScreensaverHidden = undefined;

    for (const player of this.players) {
      for (const detach of player.detachControls) detach();
      for (const slide of player.slides) {
        slide.hidden = false;
        slide.removeAttribute("aria-hidden");
      }
      player.detachControls = [];
    }

    this.players = [];
    this.pausedByScreensaver = false;
  }

  private createPlayer(root: HTMLElement): PlayerState | null {
    const slides = Array.from(root.querySelectorAll<HTMLElement>(this.options.slideSelector));
    if (slides.length === 0) return null;

    const player: PlayerState = {
      root,
      slides,
      index: 0,
      autoplayTimer: null,
      detachControls: [],
    };

    const prevButton = root.querySelector<HTMLElement>(this.options.prevSelector);
    if (prevButton) {
      const onPrev = () => this.prev(player);
      prevButton.addEventListener("click", onPrev);
      player.detachControls.push(() => prevButton.removeEventListener("click", onPrev));
    }

    const nextButton = root.querySelector<HTMLElement>(this.options.nextSelector);
    if (nextButton) {
      const onNext = () => this.next(player);
      nextButton.addEventListener("click", onNext);
      player.detachControls.push(() => nextButton.removeEventListener("click", onNext));
    }

    this.render(player);
    return player;
  }

  private next(player: PlayerState): void {
    if (player.slides.length <= 1) return;
    player.index = (player.index + 1) % player.slides.length;
    this.render(player);
  }

  private prev(player: PlayerState): void {
    if (player.slides.length <= 1) return;
    player.index = (player.index - 1 + player.slides.length) % player.slides.length;
    this.render(player);
  }

  private render(player: PlayerState): void {
    for (let i = 0; i < player.slides.length; i += 1) {
      const visible = i === player.index;
      player.slides[i].hidden = !visible;
      player.slides[i].setAttribute("aria-hidden", String(!visible));
    }
  }

  private updateAutoplay(): void {
    if (this.options.autoplayMs <= 0 || this.pausedByScreensaver) {
      this.clearAutoplay();
      return;
    }

    for (const player of this.players) {
      if (player.slides.length <= 1 || player.autoplayTimer !== null) continue;
      player.autoplayTimer = window.setInterval(() => {
        this.next(player);
      }, this.options.autoplayMs);
    }
  }

  private clearAutoplay(): void {
    for (const player of this.players) {
      if (player.autoplayTimer === null) continue;
      clearInterval(player.autoplayTimer);
      player.autoplayTimer = null;
    }
  }
}
