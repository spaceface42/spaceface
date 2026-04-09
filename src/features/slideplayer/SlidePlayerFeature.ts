import type { Feature, FeatureMountContext } from "../../core/feature.js";
import { createLogger, type Logger } from "../../core/logger.js";
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
  private static readonly SWIPE_THRESHOLD_PX = 36;
  private static readonly SWIPE_OFF_AXIS_THRESHOLD_PX = 24;
  private static activeMountCount = 0;

  private options: Required<SlidePlayerFeatureOptions>;
  private root: HTMLElement | null = null;
  private stage: HTMLElement | null = null;
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
  private detachKeydown?: () => void;
  private detachPointerDown?: () => void;
  private detachPointerUp?: () => void;
  private detachPointerCancel?: () => void;
  private detachTouchStart?: () => void;
  private detachTouchEnd?: () => void;
  private detachTouchCancel?: () => void;
  private swipePointerId: number | null = null;
  private swipeStartX = 0;
  private swipeStartY = 0;
  private logger: Logger = createLogger("slideplayer", "warn");
  private addedRootTabIndex = false;
  private countedAsMounted = false;

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

  mount(el: HTMLElement, context?: FeatureMountContext): void {
    this.logger = context?.logger ?? this.logger;
    this.root = el;
    this.stage = this.root.querySelector<HTMLElement>("[data-slideplayer-stage]");
    this.slides = Array.from(this.root.querySelectorAll<HTMLElement>(this.options.slideSelector));
    this.bullets = this.collectBullets();
    this.index = this.readInitialIndex();

    if (SlidePlayerFeature.activeMountCount > 0) {
      this.logger.warn("duplicate slideplayer mount", {
        reason: "singleton-authored-contract",
      });
    }
    SlidePlayerFeature.activeMountCount += 1;
    this.countedAsMounted = true;

    if (this.root.getAttribute("tabindex") === null) {
      this.root.setAttribute("tabindex", "0");
      this.addedRootTabIndex = true;
    }

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
    this.detachKeydown?.();
    this.detachKeydown = undefined;
    this.detachPointerDown?.();
    this.detachPointerDown = undefined;
    this.detachPointerUp?.();
    this.detachPointerUp = undefined;
    this.detachPointerCancel?.();
    this.detachPointerCancel = undefined;
    this.detachTouchStart?.();
    this.detachTouchStart = undefined;
    this.detachTouchEnd?.();
    this.detachTouchEnd = undefined;
    this.detachTouchCancel?.();
    this.detachTouchCancel = undefined;

    for (const detach of this.detachBulletClicks) {
      detach();
    }
    this.detachBulletClicks = [];

    if (this.root && this.addedRootTabIndex) {
      this.root.removeAttribute("tabindex");
    }

    this.root = null;
    this.stage = null;
    this.slides = [];
    this.bullets = [];
    this.index = 0;
    this.pausedByScreensaver = false;
    this.autoplayRemainingMs = this.options.autoplayMs;
    this.swipePointerId = null;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.addedRootTabIndex = false;
    if (this.countedAsMounted) {
      SlidePlayerFeature.activeMountCount = Math.max(0, SlidePlayerFeature.activeMountCount - 1);
      this.countedAsMounted = false;
    }
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
      const onPrev = () => {
        this.prev(true);
        this.focusRoot();
      };
      prevButton.addEventListener("click", onPrev);
      this.detachPrevClick = () => prevButton.removeEventListener("click", onPrev);
    }

    const nextButton = this.root.querySelector<HTMLElement>(this.options.nextSelector);
    if (nextButton) {
      const onNext = () => {
        this.next(true);
        this.focusRoot();
      };
      nextButton.addEventListener("click", onNext);
      this.detachNextClick = () => nextButton.removeEventListener("click", onNext);
    }

    this.detachBulletClicks = this.bullets.map((button, index) => {
      const onClick = () => {
        this.goTo(index, true);
        this.focusRoot();
      };
      button.addEventListener("click", onClick);
      return () => button.removeEventListener("click", onClick);
    });

    const onKeydown = (event: KeyboardEvent) => {
      if (this.pausedByScreensaver || this.slides.length <= 1 || shouldIgnoreKeydown(event)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.prev(true);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        this.next(true);
      }
    };
    this.root.addEventListener("keydown", onKeydown);
    this.detachKeydown = () => this.root?.removeEventListener("keydown", onKeydown);

    if (this.stage) {
      const onPointerDown = (event: PointerEvent) => {
        if (this.pausedByScreensaver || this.slides.length <= 1) return;
        if (typeof event.button === "number" && event.button !== 0) return;
        this.swipePointerId = event.pointerId;
        this.swipeStartX = event.clientX;
        this.swipeStartY = event.clientY;
        this.focusRoot();
        if (typeof this.stage?.setPointerCapture === "function") {
          try {
            this.stage.setPointerCapture(event.pointerId);
          } catch {
            // Pointer capture is best-effort. Gesture handling still works without it.
          }
        }
      };
      const onPointerUp = (event: PointerEvent) => {
        if (this.swipePointerId === null || event.pointerId !== this.swipePointerId) return;
        releasePointerCapture(this.stage, event.pointerId);
        this.handleSwipeDelta(event.clientX - this.swipeStartX, event.clientY - this.swipeStartY);
      };
      const onPointerCancel = (event: PointerEvent) => {
        releasePointerCapture(this.stage, event.pointerId);
        this.resetSwipeState();
      };
      const onTouchStart = (event: TouchEvent) => {
        if (this.pausedByScreensaver || this.slides.length <= 1) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        this.swipePointerId = -1;
        this.swipeStartX = touch.clientX;
        this.swipeStartY = touch.clientY;
        this.focusRoot();
      };
      const onTouchEnd = (event: TouchEvent) => {
        if (this.swipePointerId !== -1) return;
        const touch = event.changedTouches[0];
        if (!touch) return;
        this.handleSwipeDelta(touch.clientX - this.swipeStartX, touch.clientY - this.swipeStartY);
      };
      const onTouchCancel = () => this.resetSwipeState();

      this.stage.addEventListener("pointerdown", onPointerDown);
      this.stage.addEventListener("pointerup", onPointerUp);
      this.stage.addEventListener("pointercancel", onPointerCancel);
      this.stage.addEventListener("touchstart", onTouchStart, { passive: true });
      this.stage.addEventListener("touchend", onTouchEnd, { passive: true });
      this.stage.addEventListener("touchcancel", onTouchCancel, { passive: true });

      this.detachPointerDown = () => this.stage?.removeEventListener("pointerdown", onPointerDown);
      this.detachPointerUp = () => this.stage?.removeEventListener("pointerup", onPointerUp);
      this.detachPointerCancel = () => this.stage?.removeEventListener("pointercancel", onPointerCancel);
      this.detachTouchStart = () => this.stage?.removeEventListener("touchstart", onTouchStart);
      this.detachTouchEnd = () => this.stage?.removeEventListener("touchend", onTouchEnd);
      this.detachTouchCancel = () => this.stage?.removeEventListener("touchcancel", onTouchCancel);
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

  private focusRoot(): void {
    if (this.root && typeof this.root.focus === "function") {
      this.root.focus();
    }
  }

  private resetSwipeState(): void {
    this.swipePointerId = null;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
  }

  private handleSwipeDelta(deltaX: number, deltaY: number): void {
    this.resetSwipeState();
    if (Math.abs(deltaX) < SlidePlayerFeature.SWIPE_THRESHOLD_PX) return;
    if (Math.abs(deltaY) > SlidePlayerFeature.SWIPE_OFF_AXIS_THRESHOLD_PX) return;
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.7) return;

    if (deltaX < 0) {
      this.next(true);
    } else {
      this.prev(true);
    }
  }
}

function shouldIgnoreKeydown(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
    return true;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tagName = target.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

function releasePointerCapture(target: HTMLElement | null, pointerId: number): void {
  if (
    !target ||
    typeof target.hasPointerCapture !== "function" ||
    typeof target.releasePointerCapture !== "function" ||
    !target.hasPointerCapture(pointerId)
  ) {
    return;
  }

  try {
    target.releasePointerCapture(pointerId);
  } catch {
    // Pointer capture release should never break the interaction path.
  }
}
