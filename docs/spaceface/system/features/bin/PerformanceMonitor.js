export const VERSION = 'nextworld-1.0.0';
export class PerformanceMonitor {
    fps = 60;
    lastTime = performance.now();
    frameSkipThreshold = 30;
    shouldSkipFrame = false;
    frameCount = 0;
    cachedPerformanceLevel = 'high';
    lastLevelUpdate = 0;
    levelUpdateInterval = 1000;
    cachedSettings = null;
    lastLoggedFPS = 60;
    fpsLogThreshold = 5;
    update() {
        const now = performance.now();
        const delta = now - this.lastTime;
        if (delta < 1)
            return this.shouldSkipFrame;
        const currentFPS = 1000 / delta;
        this.fps = this.fps * 0.9 + currentFPS * 0.1;
        this.frameCount++;
        this.shouldSkipFrame = this.fps < this.frameSkipThreshold;
        if (Math.abs(this.fps - this.lastLoggedFPS) >= this.fpsLogThreshold) {
            this.lastLoggedFPS = this.fps;
        }
        this.lastTime = now;
        return this.shouldSkipFrame;
    }
    getFrameCount() { return this.frameCount; }
    getCurrentFPS() { return Math.round(this.fps * 10) / 10; }
    getPerformanceLevel() {
        const now = performance.now();
        if (now - this.lastLevelUpdate > this.levelUpdateInterval) {
            this.cachedPerformanceLevel = this.fps >= 50 ? 'high' : this.fps >= 30 ? 'medium' : 'low';
            this.lastLevelUpdate = now;
            this.cachedSettings = null;
        }
        return this.cachedPerformanceLevel;
    }
    getRecommendedSettings() {
        if (this.cachedSettings)
            return this.cachedSettings;
        const level = this.getPerformanceLevel();
        const settingsMap = {
            high: { maxImages: 50, speedMultiplier: 1.0, useSubpixel: true },
            medium: { maxImages: 25, speedMultiplier: 0.8, useSubpixel: false },
            low: { maxImages: 10, speedMultiplier: 0.5, useSubpixel: false },
        };
        this.cachedSettings = settingsMap[level];
        return this.cachedSettings;
    }
    reset() {
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
//# sourceMappingURL=PerformanceMonitor.js.map