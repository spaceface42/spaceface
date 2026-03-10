// src/features/floating-images/FloatingImagesFeature.ts
import type { Feature } from "../../core/feature.js";
import { globalScheduler } from "../../core/scheduler.js";
import { waitForImagesReady } from "../shared/images.js";
import { clamp, distance, gaussianRandom, randomBetween } from "../shared/mathUtils.js";

interface MotionItem {
  el: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  speedMultiplier: number;
  // Track rendered state to avoid redundant DOM writes
  renderedX: number;
  renderedY: number;
}

export interface FloatingImagesFeatureOptions {
  containerSelector?: string;
  itemSelector?: string;
  baseSpeed?: number;
  hoverBehavior?: "none" | "slow" | "pause";
  hoverSlowMultiplier?: number;
  initialDistribution?: "gaussian" | "random";
}

export class FloatingImagesFeature implements Feature {
  readonly name = "floating-images";
  static selector = "floating-images";
  // In a more advanced setup, options could be injected or read from data-* attributes

  private options: Required<FloatingImagesFeatureOptions>;
  private container: HTMLElement | null = null;
  private items: MotionItem[] = [];
  private inViewport = true;
  private hoveredItem: HTMLElement | null = null;
  private bounds = { width: 0, height: 0 };
  private resizeRafId: number | null = null;
  private intersectionObserver?: IntersectionObserver;
  private unsubScheduler?: () => void;
  private destroyed = false;
  private preparedNodes: HTMLElement[] = [];

  constructor(options: FloatingImagesFeatureOptions = {}) {
    this.options = {
      containerSelector: options.containerSelector ?? "[data-floating-images]",
      itemSelector: options.itemSelector ?? "[data-floating-item], .floating-image",
      baseSpeed: options.baseSpeed ?? 46,
      hoverBehavior: options.hoverBehavior ?? "none",
      hoverSlowMultiplier: options.hoverSlowMultiplier ?? 0.2,
      initialDistribution: options.initialDistribution ?? "gaussian",
    };
  }

  async mount(el: HTMLElement): Promise<void> {
    this.container = el;
    this.destroyed = false;

    // Instantly hide items to prevent flickering before images load and math is calculated
    this.preparedNodes = Array.from(this.container.querySelectorAll<HTMLElement>(this.options.itemSelector));
    for (const node of this.preparedNodes) {
      node.style.position = "absolute";
      node.style.visibility = "hidden";
    }

    await waitForImagesReady(this.container, {
      selector: this.options.itemSelector,
      timeoutMs: 5000,
    });
    if (this.destroyed) return;

    this.items = this.collectItems(this.container);
    if (this.items.length === 0) return;

    // Ensure valid initial layout
    for (const item of this.items) {
      this.renderItem(item);
    }

    this.bounds = this.readBounds();
    window.addEventListener("resize", this.onResize, { passive: true });
    this.attachViewportObserver();
    this.updateAnimationState();
  }

  destroy(): void {
    this.destroyed = true;
    this.unsubScheduler?.();
    this.unsubScheduler = undefined;

    if (this.resizeRafId !== null) {
      cancelAnimationFrame(this.resizeRafId);
      this.resizeRafId = null;
    }

    window.removeEventListener("resize", this.onResize);
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = undefined;

    const nodesToRestore = new Set<HTMLElement>(this.preparedNodes);
    for (const item of this.items) {
      nodesToRestore.add(item.el);
    }

    for (const node of nodesToRestore) {
      node.removeEventListener("pointerenter", this.onItemPointerEnter);
      node.removeEventListener("pointerleave", this.onItemPointerLeave);
      node.style.transform = "";
      node.style.willChange = "";
      node.style.position = "";
      node.style.left = "";
      node.style.top = "";
      node.style.visibility = "";
    }

    this.items = [];
    this.preparedNodes = [];
    this.container = null;
    this.inViewport = true;
    this.hoveredItem = null;
  }

  private updateAnimationState(): void {
    if (this.destroyed) return;
    const shouldRun = this.inViewport;

    if (!shouldRun) {
      if (this.unsubScheduler) {
        this.unsubScheduler();
        this.unsubScheduler = undefined;
      }
      return;
    }

    if (!this.unsubScheduler) {
      this.unsubScheduler = globalScheduler.add({
        update: this.updateLogic,
        render: this.renderDOM,
      });
    }
  }

  // --- vNext Unified Loop: Phase 1: Update (Read DOM/Math only) ---
  private readonly updateLogic = (dt: number): void => {
    if (!this.container) return;
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
    }
  };

  // --- vNext Unified Loop: Phase 2: Render (Write DOM only) ---
  private readonly renderDOM = (): void => {
    for (const item of this.items) {
      this.renderItem(item);
    }
  };

  private renderItem(item: MotionItem): void {
    const rx = Math.round(item.x);
    const ry = Math.round(item.y);
    if (rx === item.renderedX && ry === item.renderedY) return;
    item.renderedX = rx;
    item.renderedY = ry;
    item.el.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
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
      el.style.visibility = "visible";

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
        this.renderItem(item); // safe DOM write during RAF
      }
    });
  };

  private readBounds(): { width: number; height: number } {
    if (!this.container) return { width: 0, height: 0 };
    return {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
    };
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
