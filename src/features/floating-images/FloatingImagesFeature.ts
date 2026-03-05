import type { Feature, StartupContext } from "../../core/lifecycle.js";
import type { UnsubscribeFn } from "../../core/events.js";
import { animationScheduler } from "../../core/animation.js";
import type { AnimationFrameContext } from "../../core/animation.js";
import { waitForImagesReady } from "../../core/images.js";
import { rebindOnRoute } from "../../core/rebindOnRoute.js";

interface MotionItem {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  speedMultiplier: number;
  renderedX: number;
  renderedY: number;
}

export interface FloatingImagesFeatureOptions {
  containerSelector?: string;
  itemSelector?: string;
  baseSpeed?: number;
  pauseOnScreensaver?: boolean;
  hoverBehavior?: "none" | "slow" | "pause";
  hoverSlowMultiplier?: number;
  initialDistribution?: "gaussian" | "random";
}

export class FloatingImagesFeature implements Feature {
  readonly name = "floating-images";
  readonly domBound = true;

  private readonly options: Required<FloatingImagesFeatureOptions>;
  private container: HTMLElement | null = null;
  private items: MotionItem[] = [];
  private running = false;
  private pausedByScreensaver = false;
  private inViewport = true;
  private initRunId = 0;
  private hoveredItem: HTMLElement | null = null;
  private bounds = { width: 0, height: 0 };
  private resizeRafId: number | null = null;
  private intersectionObserver?: IntersectionObserver;
  private unsubAnimation?: UnsubscribeFn;
  private unsubScreensaverShown?: UnsubscribeFn;
  private unsubScreensaverHidden?: UnsubscribeFn;

  constructor(options: FloatingImagesFeatureOptions = {}) {
    this.options = {
      containerSelector: options.containerSelector ?? "[data-floating-images]",
      itemSelector: options.itemSelector ?? "[data-floating-item], .floating-image",
      baseSpeed: options.baseSpeed ?? 46,
      pauseOnScreensaver: options.pauseOnScreensaver ?? true,
      hoverBehavior: options.hoverBehavior ?? "none",
      hoverSlowMultiplier: options.hoverSlowMultiplier ?? 0.2,
      initialDistribution: options.initialDistribution ?? "gaussian",
    };
  }

  async init(ctx: StartupContext): Promise<void> {
    const runId = ++this.initRunId;
    this.container = document.querySelector<HTMLElement>(this.options.containerSelector);
    if (!this.container) {
      ctx.logger.debug("floating-images skipped: container missing", {
        selector: this.options.containerSelector,
      });
      return;
    }

    await waitForImagesReady(this.container, {
      selector: this.options.itemSelector,
      timeoutMs: 5000,
    });
    if (runId !== this.initRunId) return;

    this.items = this.collectItems(this.container);
    if (this.items.length === 0) {
      ctx.logger.debug("floating-images skipped: no items", {
        selector: this.options.itemSelector,
      });
      return;
    }

    // Ensure valid initial layout even if animation is paused or first RAF tick is delayed.
    for (const item of this.items) {
      this.renderItem(item);
    }

    this.running = true;
    this.pausedByScreensaver = false;
    this.bounds = this.readBounds();
    window.addEventListener("resize", this.onResize, { passive: true });
    this.attachViewportObserver();
    if (this.options.pauseOnScreensaver) {
      this.unsubScreensaverShown = ctx.events.on("screensaver:shown", () => {
        this.pausedByScreensaver = true;
        this.updateAnimationState();
      });
      this.unsubScreensaverHidden = ctx.events.on("screensaver:hidden", () => {
        this.pausedByScreensaver = false;
        this.updateAnimationState();
      });
    }
    this.updateAnimationState();

    ctx.logger.info("floating-images initialized", {
      items: this.items.length,
      selector: this.options.containerSelector,
      initialDistribution: this.options.initialDistribution,
    });
  }

  destroy(): void {
    this.initRunId += 1;
    this.running = false;
    this.unsubAnimation?.();
    this.unsubAnimation = undefined;
    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }
    window.removeEventListener("resize", this.onResize);
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;
    this.unsubScreensaverShown?.();
    this.unsubScreensaverHidden?.();
    this.unsubScreensaverShown = undefined;
    this.unsubScreensaverHidden = undefined;

    for (const item of this.items) {
      item.el.removeEventListener("pointerenter", this.onItemPointerEnter);
      item.el.removeEventListener("pointerleave", this.onItemPointerLeave);
      item.el.style.transform = "";
      item.el.style.willChange = "";
      item.el.style.position = "";
      item.el.style.left = "";
      item.el.style.top = "";
    }

    this.items = [];
    this.container = null;
    this.pausedByScreensaver = false;
    this.inViewport = true;
    this.hoveredItem = null;
  }

  onRouteChange(_nextRoute: string, ctx: StartupContext): void {
    this.container = rebindOnRoute<HTMLElement>({
      getNextBinding: () => document.querySelector<HTMLElement>(this.options.containerSelector),
      currentBinding: this.container,
      hasActiveState: this.items.length > 0,
      onInit: () => {
        void this.init(ctx);
      },
      onDestroy: () => this.destroy(),
    });
  }

  private collectItems(container: HTMLElement): MotionItem[] {
    const containerRect = container.getBoundingClientRect();
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    const nodes = Array.from(container.querySelectorAll<HTMLElement>(this.options.itemSelector));
    const useGaussian = this.options.initialDistribution === "gaussian";
    const placedCenters: Array<{ x: number; y: number }> = [];

    return nodes.map((el, index) => {
      const rect = el.getBoundingClientRect();
      const width = Math.max(28, Math.round(rect.width || 48));
      const height = Math.max(28, Math.round(rect.height || 48));

      const centerX = containerRect.width * 0.5 - width * 0.5;
      const centerY = containerRect.height * 0.5 - height * 0.5;
      const spread = Math.max(24, Math.min(containerRect.width, containerRect.height) * 0.18);
      const maxX = Math.max(0, containerRect.width - width);
      const maxY = Math.max(0, containerRect.height - height);
      const minDistance = Math.max(18, Math.min(width, height) * 0.7);

      let x = 0;
      let y = 0;
      if (useGaussian) {
        x = clamp(centerX + gaussianRandom() * spread, 0, maxX);
        y = clamp(centerY + gaussianRandom() * spread, 0, maxY);

        // Try a few candidates and pick one that avoids excessive initial overlap.
        for (let i = 0; i < 18; i += 1) {
          const candidateX = clamp(centerX + gaussianRandom() * spread, 0, maxX);
          const candidateY = clamp(centerY + gaussianRandom() * spread, 0, maxY);
          const candidateCenterX = candidateX + width * 0.5;
          const candidateCenterY = candidateY + height * 0.5;
          const tooClose = placedCenters.some((p) => distance(p.x, p.y, candidateCenterX, candidateCenterY) < minDistance);
          if (!tooClose) {
            x = candidateX;
            y = candidateY;
            break;
          }
        }
        placedCenters.push({ x: x + width * 0.5, y: y + height * 0.5 });
      } else {
        x = randomBetween(0, maxX);
        y = randomBetween(0, maxY);
      }

      const direction = index % 2 === 0 ? 1 : -1;
      const jitter = (index % 3) * 0.08;
      const speedVariance = randomBetween(0.8, 1.2);

      el.style.position = "absolute";
      el.style.left = "0";
      el.style.top = "0";
      el.style.willChange = "transform";
      if (this.options.hoverBehavior !== "none") {
        el.addEventListener("pointerenter", this.onItemPointerEnter, { passive: true });
        el.addEventListener("pointerleave", this.onItemPointerLeave, { passive: true });
      }

      return {
        el,
        x,
        y,
        vx: this.options.baseSpeed * (1 + jitter) * speedVariance * direction,
        vy: this.options.baseSpeed * (0.65 + jitter) * speedVariance * -direction,
        width,
        height,
        speedMultiplier: 1,
        renderedX: Number.NaN,
        renderedY: Number.NaN,
      };
    });
  }

  private readonly onResize = (): void => {
    if (this.resizeRafId !== null) return;
    this.resizeRafId = requestAnimationFrame(() => {
      this.resizeRafId = null;
      if (!this.container || this.items.length === 0) return;

      const newBounds = this.readBounds();
      if (newBounds.width === 0 && newBounds.height === 0) return;
      this.bounds = newBounds;

      for (const item of this.items) {
        item.width = Math.max(28, Math.round(item.el.getBoundingClientRect().width || item.width));
        item.height = Math.max(28, Math.round(item.el.getBoundingClientRect().height || item.height));
        item.x = clamp(item.x, 0, Math.max(0, this.bounds.width - item.width));
        item.y = clamp(item.y, 0, Math.max(0, this.bounds.height - item.height));
        this.renderItem(item);
      }
    });
  };

  private readonly tick = (frame: AnimationFrameContext): void => {
    if (!this.running || !this.container) return;
    if (frame.overloaded && frame.frame % 2 === 1) return;

    const dt = Math.min(frame.deltaMs / 1000, 0.05);
    const bounds = this.bounds;

    for (const item of this.items) {
      const targetSpeedMultiplier = this.getItemSpeedMultiplier(item.el);
      const lerp = Math.min(1, dt * 10);
      item.speedMultiplier += (targetSpeedMultiplier - item.speedMultiplier) * lerp;
      item.x += item.vx * dt * item.speedMultiplier;
      item.y += item.vy * dt * item.speedMultiplier;

      const maxX = Math.max(0, bounds.width - item.width);
      const maxY = Math.max(0, bounds.height - item.height);

      if (maxX <= 0 && maxY <= 0) {
        // If container is smaller than item, stop moving to prevent jitter
        item.x = 0;
        item.y = 0;
      } else {
        if (maxX <= 0) {
          item.x = 0;
        } else {
          if (item.x <= 0) {
            item.x = 0;
            item.vx = Math.abs(item.vx);
          } else if (item.x >= maxX) {
            item.x = maxX;
            item.vx = -Math.abs(item.vx);
          }
        }

        if (maxY <= 0) {
          item.y = 0;
        } else {
          if (item.y <= 0) {
            item.y = 0;
            item.vy = Math.abs(item.vy);
          } else if (item.y >= maxY) {
            item.y = maxY;
            item.vy = -Math.abs(item.vy);
          }
        }
      }

      this.renderItem(item);
    }
  };

  private updateAnimationState(): void {
    if (!this.running) return;
    const shouldRun = !this.pausedByScreensaver && this.inViewport;

    // If the animation scheduler is paused (e.g., due to reduced motion), we still need to
    // run at least one tick so the items aren't stuck at 0,0.
    if (!shouldRun || animationScheduler.isPaused()) {
      if (this.unsubAnimation) {
        this.unsubAnimation();
        this.unsubAnimation = undefined;
      }

      if (shouldRun && animationScheduler.isPaused()) {
        const perf = animationScheduler.getStats();
        this.tick({
          now: performance.now(),
          deltaMs: 16.7,
          frame: perf.frame,
          overloaded: false,
          fps: perf.fps,
          performanceLevel: perf.performanceLevel,
        });
      }
      return;
    }

    if (!this.unsubAnimation) {
      this.unsubAnimation = animationScheduler.add(this.tick);
    }
  }

  private readBounds(): { width: number; height: number } {
    if (!this.container) return { width: 0, height: 0 };
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
  }

  private renderItem(item: MotionItem): void {
    const rx = Math.round(item.x);
    const ry = Math.round(item.y);
    if (rx === item.renderedX && ry === item.renderedY) return;
    item.renderedX = rx;
    item.renderedY = ry;
    item.el.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
  }

  private getItemSpeedMultiplier(el: HTMLElement): number {
    if (this.hoveredItem !== el) return 1;
    if (this.options.hoverBehavior === "pause") return 0;
    if (this.options.hoverBehavior === "slow") {
      return clamp(this.options.hoverSlowMultiplier, 0, 1);
    }
    return 1;
  }

  private readonly onItemPointerEnter = (event: Event): void => {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    this.hoveredItem = target;
  };

  private readonly onItemPointerLeave = (event: Event): void => {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;
    if (this.hoveredItem === target) {
      this.hoveredItem = null;
    }
  };

  private attachViewportObserver(): void {
    if (!this.container) return;
    if (!("IntersectionObserver" in window)) return;
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== this.container) continue;
          this.inViewport = entry.isIntersecting;
          this.updateAnimationState();
        }
      },
      { root: null, threshold: 0.01 }
    );
    this.intersectionObserver.observe(this.container);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function randomBetween(min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}
