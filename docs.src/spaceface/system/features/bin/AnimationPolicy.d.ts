export type AnimationPauseReason = 'manual' | 'hover' | 'hidden' | 'inactivity' | 'screensaver';
export declare class AnimationPolicy {
    private pausedReasons;
    set(reason: AnimationPauseReason, paused: boolean): void;
    has(reason: AnimationPauseReason): boolean;
    isPaused(): boolean;
    list(): AnimationPauseReason[];
    clear(): void;
}
