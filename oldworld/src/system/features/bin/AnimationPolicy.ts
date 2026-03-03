export type AnimationPauseReason = 'manual' | 'hover' | 'hidden' | 'inactivity' | 'screensaver';

export class AnimationPolicy {
  private pausedReasons = new Set<AnimationPauseReason>();

  set(reason: AnimationPauseReason, paused: boolean): void {
    if (paused) this.pausedReasons.add(reason);
    else this.pausedReasons.delete(reason);
  }

  has(reason: AnimationPauseReason): boolean {
    return this.pausedReasons.has(reason);
  }

  isPaused(): boolean {
    return this.pausedReasons.size > 0;
  }

  list(): AnimationPauseReason[] {
    return Array.from(this.pausedReasons);
  }

  clear(): void {
    this.pausedReasons.clear();
  }
}
