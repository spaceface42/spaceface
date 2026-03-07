export type PerformanceLevel = "high" | "medium" | "low";

export interface PerformanceSnapshot {
  fps: number;
  level: PerformanceLevel;
}

export class PerformanceMonitor {
  private fps = 60;
  private lastNow = 0;
  private level: PerformanceLevel = "high";
  private lastLevelUpdate = 0;
  private readonly levelUpdateIntervalMs: number;

  constructor(levelUpdateIntervalMs = 1000) {
    this.levelUpdateIntervalMs = levelUpdateIntervalMs;
  }

  reset(now = performance.now()): void {
    this.fps = 60;
    this.lastNow = now;
    this.level = "high";
    this.lastLevelUpdate = now;
  }

  update(now: number): PerformanceSnapshot {
    if (this.lastNow <= 0) {
      this.lastNow = now;
      this.lastLevelUpdate = now;
      return this.snapshot();
    }

    const delta = now - this.lastNow;
    this.lastNow = now;
    if (delta > 0) {
      const currentFps = 1000 / delta;
      this.fps = this.fps * 0.9 + currentFps * 0.1;
    }

    if (now - this.lastLevelUpdate >= this.levelUpdateIntervalMs) {
      this.level = this.resolveLevel(this.fps);
      this.lastLevelUpdate = now;
    }

    return this.snapshot();
  }

  getSnapshot(): PerformanceSnapshot {
    return this.snapshot();
  }

  private resolveLevel(fps: number): PerformanceLevel {
    if (fps >= 50) return "high";
    if (fps >= 30) return "medium";
    return "low";
  }

  private snapshot(): PerformanceSnapshot {
    return {
      fps: Math.round(this.fps * 10) / 10,
      level: this.level,
    };
  }
}
