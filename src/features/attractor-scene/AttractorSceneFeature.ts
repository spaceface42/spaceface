import type { Feature } from "../../core/feature.js";
import { createEffect } from "../../core/signals.js";
import { screensaverActiveSignal } from "../shared/screensaverState.js";

export interface AttractorSceneFeatureOptions {
  rotateMs?: number;
}

export class AttractorSceneFeature implements Feature {
  private options: Required<AttractorSceneFeatureOptions>;
  private target: HTMLElement | null = null;
  private cleanupEffect?: () => void;
  private rotationTimer: number | null = null;
  private activeLayoutIndex = 0;

  private readonly handleResize = (): void => {
    this.syncRuntimeText();
  };

  constructor(options: AttractorSceneFeatureOptions = {}) {
    this.options = {
      rotateMs: options.rotateMs ?? 2400,
    };
  }

  mount(el: HTMLElement): void {
    this.target = el;
    this.syncRuntimeText();
    this.applyActiveLayout(0);
    window.addEventListener("resize", this.handleResize, { passive: true });

    this.cleanupEffect = createEffect(() => {
      const screensaverActive = screensaverActiveSignal.value;
      this.syncRuntimeText();

      if (!screensaverActive) {
        this.stopRotation();
        this.applyActiveLayout(0);
        return;
      }

      this.applyActiveLayout(0);
      this.startRotation();
    });
  }

  destroy(): void {
    this.stopRotation();
    this.cleanupEffect?.();
    this.cleanupEffect = undefined;
    window.removeEventListener("resize", this.handleResize);
    this.activeLayoutIndex = 0;
    this.target = null;
  }

  private startRotation(): void {
    this.stopRotation();
    const layouts = this.getLayouts();
    if (layouts.length <= 1 || prefersReducedMotion()) {
      this.applyActiveLayout(0);
      return;
    }

    this.rotationTimer = window.setInterval(() => {
      const nextIndex = (this.activeLayoutIndex + 1) % layouts.length;
      this.applyActiveLayout(nextIndex);
    }, this.options.rotateMs);
  }

  private stopRotation(): void {
    if (this.rotationTimer !== null) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  private applyActiveLayout(nextIndex: number): void {
    const layouts = this.getLayouts();
    if (layouts.length === 0) return;

    const normalizedIndex = ((nextIndex % layouts.length) + layouts.length) % layouts.length;
    this.activeLayoutIndex = normalizedIndex;

    for (const [index, layout] of layouts.entries()) {
      const isCurrent = index === normalizedIndex;
      layout.classList.toggle("is-current", isCurrent);
      layout.setAttribute("aria-hidden", isCurrent ? "false" : "true");
    }
  }

  private getLayouts(): HTMLElement[] {
    if (!this.target) return [];
    return Array.from(this.target.querySelectorAll<HTMLElement>("[data-attractor-scene-layout]"));
  }

  private syncRuntimeText(): void {
    if (!this.target) return;
    const width = this.target.querySelector<HTMLElement>("[data-attractor-scene-width]");
    const height = this.target.querySelector<HTMLElement>("[data-attractor-scene-height]");
    const year = this.target.querySelector<HTMLElement>("[data-attractor-scene-year]");
    if (width) width.textContent = String(window.innerWidth);
    if (height) height.textContent = String(window.innerHeight);
    if (year) year.textContent = String(new Date().getFullYear());
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
