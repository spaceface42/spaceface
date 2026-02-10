export declare const VERSION: "nextworld-1.0.0";
import { PerformanceLevel, PerformanceSettingsInterface } from '../../types/bin.js';
export declare class PerformanceMonitor {
    private fps;
    private lastTime;
    private frameSkipThreshold;
    private shouldSkipFrame;
    private frameCount;
    private cachedPerformanceLevel;
    private lastLevelUpdate;
    private levelUpdateInterval;
    private cachedSettings;
    private lastLoggedFPS;
    private fpsLogThreshold;
    update(): boolean;
    getFrameCount(): number;
    getCurrentFPS(): number;
    getPerformanceLevel(): PerformanceLevel;
    getRecommendedSettings(): PerformanceSettingsInterface;
    reset(): void;
}
