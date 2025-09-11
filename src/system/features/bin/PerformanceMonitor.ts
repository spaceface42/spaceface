export const VERSION = 'nextworld-1.0.0';

import {
  PerformanceLevel,
  PerformanceSettingsInterface,
} from '../../types/bin.js';

export class PerformanceMonitor {
  private fps: number = 60;
  private lastTime: number = performance.now();
  private frameSkipThreshold: number = 30;
  private shouldSkipFrame: boolean = false;
  private frameCount: number = 0;

  private cachedPerformanceLevel: PerformanceLevel = 'high';
  private lastLevelUpdate: number = 0;
  private levelUpdateInterval: number = 1000;
  private cachedSettings: PerformanceSettingsInterface | null = null;

  private lastLoggedFPS: number = 60;
  private fpsLogThreshold: number = 5;

  /** Updates FPS and returns whether to skip this frame */
  public update(): boolean {
    const now = performance.now();
    const delta = now - this.lastTime;
    if (delta < 1) return this.shouldSkipFrame;

    const currentFPS = 1000 / delta;
    this.fps = this.fps * 0.9 + currentFPS * 0.1; // smoothing
    this.frameCount++;

    this.shouldSkipFrame = this.fps < this.frameSkipThreshold;

    if (Math.abs(this.fps - this.lastLoggedFPS) >= this.fpsLogThreshold) {
      // eventBus.emit('performance:fps', { fps: this.getCurrentFPS(), frameSkip: this.shouldSkipFrame });
      this.lastLoggedFPS = this.fps;
    }

    this.lastTime = now;
    return this.shouldSkipFrame;
  }

  public getFrameCount(): number { return this.frameCount; }
  public getCurrentFPS(): number { return Math.round(this.fps * 10) / 10; }

  public getPerformanceLevel(): PerformanceLevel {
    const now = performance.now();
    if (now - this.lastLevelUpdate > this.levelUpdateInterval) {
      this.cachedPerformanceLevel = this.fps >= 50 ? 'high' : this.fps >= 30 ? 'medium' : 'low';
      this.lastLevelUpdate = now;
      this.cachedSettings = null;
      // eventBus.emit('performance:level', { level: this.cachedPerformanceLevel, fps: this.getCurrentFPS() });
    }
    return this.cachedPerformanceLevel;
  }

  public getRecommendedSettings(): PerformanceSettingsInterface {
    if (this.cachedSettings) return this.cachedSettings;

    const level = this.getPerformanceLevel();
    const settingsMap: Record<PerformanceLevel, PerformanceSettingsInterface> = {
      high: { maxImages: 50, speedMultiplier: 1.0, useSubpixel: true },
      medium: { maxImages: 25, speedMultiplier: 0.8, useSubpixel: false },
      low: { maxImages: 10, speedMultiplier: 0.5, useSubpixel: false },
    };
    this.cachedSettings = settingsMap[level];
    return this.cachedSettings;
  }

  public reset(): void {
    this.fps = 60;
    this.lastTime = performance.now();
    this.shouldSkipFrame = false;
    this.frameCount = 0;
    this.cachedPerformanceLevel = 'high';
    this.lastLevelUpdate = 0;
    this.cachedSettings = null;
    this.lastLoggedFPS = 60;
  }
}
