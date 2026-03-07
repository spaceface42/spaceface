import { PerformanceMonitor, type PerformanceLevel } from "../../core/performance.js";

export interface AnimationFrameContext {
  now: number;
  deltaMs: number;
  frame: number;
  overloaded: boolean;
  fps: number;
  performanceLevel: PerformanceLevel;
}

export interface AnimationSchedulerStats {
  callbacks: number;
  frame: number;
  running: boolean;
  paused: boolean;
  hidden: boolean;
  reducedMotion: boolean;
  averageDeltaMs: number;
  overloadFrames: number;
  fps: number;
  performanceLevel: PerformanceLevel;
}

export type AnimationCallback = (ctx: AnimationFrameContext) => void;

export class AnimationScheduler {
  private callbacks = new Set<AnimationCallback>();
  private rafId: number | null = null;
  private frame = 0;
  private lastNow = 0;
  private hidden = document.visibilityState === "hidden";
  private reducedMotion = false;
  private mediaQuery?: MediaQueryList;
  private readonly overloadThresholdMs: number;
  private averageDeltaMs = 16.7;
  private overloadFrames = 0;
  private readonly performanceMonitor = new PerformanceMonitor();

  constructor(overloadThresholdMs = 24) {
    this.overloadThresholdMs = overloadThresholdMs;
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    if (typeof window.matchMedia === "function") {
      this.mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.reducedMotion = this.mediaQuery.matches;
      this.mediaQuery.addEventListener("change", this.onMotionPreferenceChange);
    }
  }

  add(callback: AnimationCallback): () => void {
    this.callbacks.add(callback);
    this.ensureLoop();
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.stopLoop();
      }
    };
  }

  isPaused(): boolean {
    return this.hidden || this.reducedMotion;
  }

  getStats(): AnimationSchedulerStats {
    const performance = this.performanceMonitor.getSnapshot();
    return {
      callbacks: this.callbacks.size,
      frame: this.frame,
      running: this.rafId !== null,
      paused: this.isPaused(),
      hidden: this.hidden,
      reducedMotion: this.reducedMotion,
      averageDeltaMs: Number(this.averageDeltaMs.toFixed(2)),
      overloadFrames: this.overloadFrames,
      fps: performance.fps,
      performanceLevel: performance.level,
    };
  }

  private ensureLoop(): void {
    if (this.rafId !== null) return;
    if (this.callbacks.size === 0) return;
    if (this.isPaused()) return;
    this.lastNow = performance.now();
    this.performanceMonitor.reset(this.lastNow);
    this.rafId = window.requestAnimationFrame(this.onFrame);
  }

  private stopLoop(): void {
    if (this.rafId === null) return;
    window.cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private readonly onFrame = (now: number): void => {
    if (this.isPaused() || this.callbacks.size === 0) {
      this.stopLoop();
      return;
    }

    this.frame += 1;
    const deltaMs = Math.min(now - this.lastNow || 16.7, 100);
    this.lastNow = now;
    const overloaded = deltaMs > this.overloadThresholdMs;
    this.averageDeltaMs = this.averageDeltaMs * 0.9 + deltaMs * 0.1;
    if (overloaded) this.overloadFrames += 1;
    const performance = this.performanceMonitor.update(now);
    const ctx: AnimationFrameContext = {
      now,
      deltaMs,
      frame: this.frame,
      overloaded,
      fps: performance.fps,
      performanceLevel: performance.level,
    };

    for (const callback of this.callbacks) {
      try {
        callback(ctx);
      } catch (error) {
        console.error("[AnimationScheduler] callback failed", error);
      }
    }

    this.rafId = window.requestAnimationFrame(this.onFrame);
  };

  private readonly onVisibilityChange = (): void => {
    this.hidden = document.visibilityState === "hidden";
    if (this.hidden) {
      this.stopLoop();
      return;
    }
    this.ensureLoop();
  };

  private readonly onMotionPreferenceChange = (event: MediaQueryListEvent): void => {
    this.reducedMotion = event.matches;
    if (this.reducedMotion) {
      this.stopLoop();
      return;
    }
    this.ensureLoop();
  };
}

export const animationScheduler = new AnimationScheduler();
