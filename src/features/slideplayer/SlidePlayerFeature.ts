import type { Feature, StartupContext } from "../../core/lifecycle.js";
import type { UnsubscribeFn } from "../../core/events.js";
import { rebindOnRoute } from "../../core/rebindOnRoute.js";

interface PlayerState {
  root: HTMLElement;
  slides: HTMLElement[];
  bullets: Array<{ el: HTMLElement; index: number }>;
  stage: HTMLElement | null;
  bulletsRoot: HTMLElement | null;
  index: number;
  autoplayTimer: number | null;
  autoplayStartTime: number;
  autoplayRemainingMs: number;
  detachControls: Array<() => void>;
}

export interface SlidePlayerFeatureOptions {
  rootSelector?: string;
  slideSelector?: string;
  prevSelector?: string;
  nextSelector?: string;
  bulletsSelector?: string;
  autoplayMs?: number;
  pauseOnScreensaver?: boolean;
}

export class SlidePlayerFeature implements Feature {
  readonly name = "slideplayer";
  readonly domBound = true;

  private readonly options: Required<SlidePlayerFeatureOptions>;
  private players: PlayerState[] = [];
  private boundRoots: HTMLElement[] = [];
  private pausedByScreensaver = false;
  private unsubscribeScreensaverShown?: UnsubscribeFn;
  private unsubscribeScreensaverHidden?: UnsubscribeFn;
  private onKeydown?: (event: KeyboardEvent) => void;

  constructor(options: SlidePlayerFeatureOptions = {}) {
    this.options = {
      rootSelector: options.rootSelector ?? "[data-slideplayer]",
      slideSelector: options.slideSelector ?? "[data-slideplayer-image]",
      prevSelector: options.prevSelector ?? "[data-slideplayer-prev]",
      nextSelector: options.nextSelector ?? "[data-slideplayer-next]",
      bulletsSelector: options.bulletsSelector ?? "[data-slideplayer-bullet]",
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
    this.boundRoots = roots;

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

    this.bindKeyboardNavigation();
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
    if (this.onKeydown) {
      document.removeEventListener("keydown", this.onKeydown);
      this.onKeydown = undefined;
    }
    this.unsubscribeScreensaverShown = undefined;
    this.unsubscribeScreensaverHidden = undefined;

    for (const player of this.players) {
      for (const detach of player.detachControls) detach();
      for (const slide of player.slides) {
        slide.hidden = false;
        slide.classList.remove("is-active");
        slide.removeAttribute("aria-hidden");
      }
      player.stage?.classList.remove("is-ready");
      player.bulletsRoot?.classList.remove("is-ready");
      player.detachControls = [];
    }

    this.players = [];
    this.boundRoots = [];
    this.pausedByScreensaver = false;
  }

  onRouteChange(_nextRoute: string, ctx: StartupContext): void {
    const currentBinding = this.boundRoots.length > 0 ? this.boundRoots : null;
    const nextBinding = rebindOnRoute<HTMLElement[]>({
      getNextBinding: () => {
        const roots = Array.from(document.querySelectorAll<HTMLElement>(this.options.rootSelector));
        return roots.length > 0 ? roots : null;
      },
      currentBinding,
      hasActiveState: this.players.length > 0,
      onInit: () => this.init(ctx),
      onDestroy: () => this.destroy(),
      equals: sameElementArray,
    });
    this.boundRoots = nextBinding ?? [];
  }

  private createPlayer(root: HTMLElement): PlayerState | null {
    const stage = root.querySelector<HTMLElement>("[data-slideplayer-stage]");
    const bulletsRoot = root.querySelector<HTMLElement>("[data-slideplayer-bullets]");
    const slides = Array.from(root.querySelectorAll<HTMLElement>(this.options.slideSelector));
    if (slides.length === 0) return null;
    let activeIndex = slides.findIndex(s => s.classList.contains("is-active") || s.getAttribute("aria-hidden") === "false");
    if (activeIndex === -1) {
      activeIndex = slides.findIndex(s => !s.hidden);
    }
    const startIndex = Math.max(0, activeIndex);

    for (const slide of slides) {
      slide.hidden = false;
      slide.removeAttribute("hidden");
    }

    const player: PlayerState = {
      root,
      slides,
      bullets: [],
      stage,
      bulletsRoot,
      index: startIndex,
      autoplayTimer: null,
      autoplayStartTime: 0,
      autoplayRemainingMs: this.options.autoplayMs,
      detachControls: [],
    };

    const prevButton = root.querySelector<HTMLElement>(this.options.prevSelector);
    if (prevButton) {
      const onPrev = () => this.prev(player, true);
      prevButton.addEventListener("click", onPrev);
      player.detachControls.push(() => prevButton.removeEventListener("click", onPrev));
    }

    const nextButton = root.querySelector<HTMLElement>(this.options.nextSelector);
    if (nextButton) {
      const onNext = () => this.next(player, true);
      nextButton.addEventListener("click", onNext);
      player.detachControls.push(() => nextButton.removeEventListener("click", onNext));
    }

    const bullets = Array.from(root.querySelectorAll<HTMLElement>(this.options.bulletsSelector));
    if (bullets.length > 0) {
      for (let i = 0; i < bullets.length; i += 1) {
        const bullet = bullets[i];
        const datasetIndex = Number.parseInt(bullet.dataset.slideplayerBulletIndex ?? "", 10);
        const targetIndex = Number.isInteger(datasetIndex) ? datasetIndex : i;
        if (targetIndex < 0 || targetIndex >= slides.length) continue;
        const onBullet = () => this.goTo(player, targetIndex, true);
        bullet.addEventListener("click", onBullet);
        player.detachControls.push(() => bullet.removeEventListener("click", onBullet));
        player.bullets.push({ el: bullet, index: targetIndex });
      }
    }

    this.render(player);
    player.stage?.classList.add("is-ready");
    player.bulletsRoot?.classList.add("is-ready");
    return player;
  }

  private bindKeyboardNavigation(): void {
    if (this.onKeydown) return;
    this.onKeydown = (event: KeyboardEvent) => {
      if (this.players.length === 0) return;
      if (this.isEditableTarget(event.target)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const player = this.resolveKeyboardPlayer(event.target) ?? this.players[0];
      if (!player) return;

      event.preventDefault();
      if (event.key === "ArrowLeft") {
        this.prev(player, true);
        return;
      }
      this.next(player, true);
    };
    document.addEventListener("keydown", this.onKeydown);
  }

  private resolveKeyboardPlayer(target: EventTarget | null): PlayerState | null {
    const el = target as Element | null;
    if (!el) return null;
    const root = el.closest(this.options.rootSelector);
    if (!root) return null;
    return this.players.find((player) => player.root === root) ?? null;
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    if (el instanceof HTMLInputElement) return true;
    if (el instanceof HTMLTextAreaElement) return true;
    if (el instanceof HTMLSelectElement) return true;
    return Boolean(el.closest("[contenteditable='true']"));
  }

  private goTo(player: PlayerState, index: number, manual = false): void {
    if (index < 0 || index >= player.slides.length || index === player.index) return;
    player.index = index;
    this.render(player);
    if (manual) this.resetAutoplay(player);
  }

  private next(player: PlayerState, manual = false): void {
    if (player.slides.length <= 1) return;
    player.index = (player.index + 1) % player.slides.length;
    this.render(player);
    if (manual) this.resetAutoplay(player);
  }

  private prev(player: PlayerState, manual = false): void {
    if (player.slides.length <= 1) return;
    player.index = (player.index - 1 + player.slides.length) % player.slides.length;
    this.render(player);
    if (manual) this.resetAutoplay(player);
  }

  private render(player: PlayerState): void {
    for (let i = 0; i < player.slides.length; i += 1) {
      const visible = i === player.index;
      player.slides[i].hidden = false;
      player.slides[i].classList.toggle("is-active", visible);
      player.slides[i].setAttribute("aria-hidden", String(!visible));
    }

    for (let i = 0; i < player.bullets.length; i += 1) {
      const bullet = player.bullets[i];
      const active = bullet.index === player.index;
      bullet.el.classList.toggle("active", active);
      bullet.el.setAttribute("aria-current", active ? "true" : "false");
    }
  }

  private scheduleNextAutoplay(player: PlayerState, waitMs: number): void {
    if (player.autoplayTimer !== null) {
      clearTimeout(player.autoplayTimer);
    }
    player.autoplayStartTime = Date.now();
    player.autoplayRemainingMs = waitMs;
    player.autoplayTimer = window.setTimeout(() => {
      this.next(player, false);
      this.scheduleNextAutoplay(player, this.options.autoplayMs);
    }, waitMs);
  }

  private resetAutoplay(player: PlayerState): void {
    player.autoplayRemainingMs = this.options.autoplayMs;
    if (player.autoplayTimer !== null && !this.pausedByScreensaver) {
      this.scheduleNextAutoplay(player, this.options.autoplayMs);
    }
  }

  private updateAutoplay(): void {
    if (this.options.autoplayMs <= 0) {
      this.clearAutoplay();
      return;
    }
    if (this.pausedByScreensaver) {
      for (const player of this.players) {
        if (player.autoplayTimer !== null) {
          const elapsed = Date.now() - player.autoplayStartTime;
          player.autoplayRemainingMs = Math.max(0, player.autoplayRemainingMs - elapsed);
          clearTimeout(player.autoplayTimer);
          player.autoplayTimer = null;
        }
      }
      return;
    }

    for (const player of this.players) {
      if (player.slides.length <= 1 || player.autoplayTimer !== null) continue;
      this.scheduleNextAutoplay(player, player.autoplayRemainingMs > 0 ? player.autoplayRemainingMs : this.options.autoplayMs);
    }
  }

  private clearAutoplay(): void {
    for (const player of this.players) {
      if (player.autoplayTimer === null) continue;
      clearTimeout(player.autoplayTimer);
      player.autoplayTimer = null;
    }
  }
}

function sameElementArray(a: HTMLElement[], b: HTMLElement[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
