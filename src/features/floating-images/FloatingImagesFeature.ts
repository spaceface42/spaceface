import type { Feature, StartupContext } from "../../core/lifecycle.js";
import type { UnsubscribeFn } from "../../core/events.js";
import { animationScheduler } from "../../core/animation.js";
import type { AnimationFrameContext } from "../../core/animation.js";
import { waitForImagesReady } from "../../core/images.js";

interface MotionItem {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

export interface FloatingImagesFeatureOptions {
  containerSelector?: string;
  itemSelector?: string;
  baseSpeed?: number;
  pauseOnScreensaver?: boolean;
}

export class FloatingImagesFeature implements Feature {
  readonly name = "floating-images";

  private readonly options: Required<FloatingImagesFeatureOptions>;
  private container: HTMLElement | null = null;
  private items: MotionItem[] = [];
  private running = false;
  private pausedByScreensaver = false;
  private initRunId = 0;
  private unsubAnimation?: UnsubscribeFn;
  private unsubScreensaverShown?: UnsubscribeFn;
  private unsubScreensaverHidden?: UnsubscribeFn;

  constructor(options: FloatingImagesFeatureOptions = {}) {
    this.options = {
      containerSelector: options.containerSelector ?? "[data-floating-images]",
      itemSelector: options.itemSelector ?? "[data-floating-item], .floating-image",
      baseSpeed: options.baseSpeed ?? 46,
      pauseOnScreensaver: options.pauseOnScreensaver ?? true,
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

    this.running = true;
    this.pausedByScreensaver = false;
    window.addEventListener("resize", this.onResize, { passive: true });
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
    });
  }

  destroy(): void {
    this.initRunId += 1;
    this.running = false;
    this.unsubAnimation?.();
    this.unsubAnimation = undefined;
    window.removeEventListener("resize", this.onResize);
    this.unsubScreensaverShown?.();
    this.unsubScreensaverHidden?.();
    this.unsubScreensaverShown = undefined;
    this.unsubScreensaverHidden = undefined;

    for (const item of this.items) {
      item.el.style.transform = "";
      item.el.style.willChange = "";
      item.el.style.position = "";
      item.el.style.left = "";
      item.el.style.top = "";
    }

    this.items = [];
    this.container = null;
    this.pausedByScreensaver = false;
  }

  onRouteChange(_nextRoute: string, ctx: StartupContext): void {
    const hasContainer = Boolean(document.querySelector(this.options.containerSelector));
    if (hasContainer && this.items.length === 0) {
      void this.init(ctx);
      return;
    }
    if (!hasContainer && this.items.length > 0) {
      this.destroy();
    }
  }

  private collectItems(container: HTMLElement): MotionItem[] {
    const containerRect = container.getBoundingClientRect();
    if (getComputedStyle(container).position === "static") {
      container.style.position = "relative";
    }

    const nodes = Array.from(container.querySelectorAll<HTMLElement>(this.options.itemSelector));
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

      let x = clamp(centerX + gaussianRandom() * spread, 0, maxX);
      let y = clamp(centerY + gaussianRandom() * spread, 0, maxY);

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

      const direction = index % 2 === 0 ? 1 : -1;
      const jitter = (index % 3) * 0.08;

      el.style.position = "absolute";
      el.style.left = "0";
      el.style.top = "0";
      el.style.willChange = "transform";

      return {
        el,
        x,
        y,
        vx: this.options.baseSpeed * (1 + jitter) * direction,
        vy: this.options.baseSpeed * (0.65 + jitter) * -direction,
        width,
        height,
      };
    });
  }

  private readonly onResize = (): void => {
    if (!this.container || this.items.length === 0) return;
    const bounds = this.getBounds();
    for (const item of this.items) {
      item.width = Math.max(28, Math.round(item.el.getBoundingClientRect().width || item.width));
      item.height = Math.max(28, Math.round(item.el.getBoundingClientRect().height || item.height));
      item.x = clamp(item.x, 0, Math.max(0, bounds.width - item.width));
      item.y = clamp(item.y, 0, Math.max(0, bounds.height - item.height));
      this.renderItem(item);
    }
  };

  private readonly tick = (frame: AnimationFrameContext): void => {
    if (!this.running || !this.container) return;
    if (frame.overloaded && frame.frame % 2 === 1) return;

    const dt = Math.min(frame.deltaMs / 1000, 0.05);
    const bounds = this.getBounds();

    for (const item of this.items) {
      item.x += item.vx * dt;
      item.y += item.vy * dt;

      const maxX = Math.max(0, bounds.width - item.width);
      const maxY = Math.max(0, bounds.height - item.height);

      if (item.x <= 0) {
        item.x = 0;
        item.vx = Math.abs(item.vx);
      } else if (item.x >= maxX) {
        item.x = maxX;
        item.vx = -Math.abs(item.vx);
      }

      if (item.y <= 0) {
        item.y = 0;
        item.vy = Math.abs(item.vy);
      } else if (item.y >= maxY) {
        item.y = maxY;
        item.vy = -Math.abs(item.vy);
      }

      this.renderItem(item);
    }
  };

  private updateAnimationState(): void {
    if (!this.running) return;
    const shouldRun = !this.pausedByScreensaver;
    if (shouldRun && !this.unsubAnimation) {
      this.unsubAnimation = animationScheduler.add(this.tick);
      return;
    }
    if (!shouldRun && this.unsubAnimation) {
      this.unsubAnimation();
      this.unsubAnimation = undefined;
    }
  }

  private getBounds(): { width: number; height: number } {
    if (!this.container) return { width: 0, height: 0 };
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
  }

  private renderItem(item: MotionItem): void {
    item.el.style.transform = `translate3d(${Math.round(item.x)}px, ${Math.round(item.y)}px, 0)`;
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
