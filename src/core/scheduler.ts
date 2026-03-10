// src/core/scheduler.ts

/**
 * Unified Render/Physics Loop.
 * Enforces a Read-then-Write execution order to prevent layout thrashing.
 */
export interface ScheduledTask {
  /** Phase 1: Math and logic (Safe to read DOM, DO NOT mutate DOM) */
  update?: (dt: number) => void;
  /** Phase 2: DOM Mutation (Safe to write DOM, DO NOT read DOM to avoid thrashing) */
  render?: () => void;
}

export class FrameScheduler {
  private tasks = new Set<ScheduledTask>();
  private running = false;
  private lastTime = 0;
  private rafId: number | null = null;
  private readonly maxDelta = 0.05; // Max 50ms delta to prevent huge jumps

  /**
   * Adds a task to the scheduler and starts it if not already running.
   * Returns a cleanup function to remove the task.
   */
  add(task: ScheduledTask): () => void {
    this.tasks.add(task);
    if (!this.running && this.tasks.size > 0) {
      this.start();
    }
    return () => {
      this.tasks.delete(task);
      if (this.tasks.size === 0) {
        this.stop();
      }
    };
  }

  get isRunning(): boolean {
    return this.running;
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private readonly tick = (time: number): void => {
    if (!this.running) return;

    const deltaMs = time - this.lastTime;
    this.lastTime = time;
    const dt = Math.min(deltaMs / 1000, this.maxDelta);
    const tasks = Array.from(this.tasks);

    // Phase 1: Read/Compute (DOM reads are safe here, DOM writes are forbidden)
    for (const task of tasks) {
      if (!this.tasks.has(task)) continue;
      try {
        task.update?.(dt);
      } catch (error) {
        this.handleTaskError(task, error);
      }
    }

    // Phase 2: Render/Mutate (DOM mutations only here, reads are forbidden to avoid layout thrashing)
    for (const task of tasks) {
      if (!this.tasks.has(task)) continue;
      try {
        task.render?.();
      } catch (error) {
        this.handleTaskError(task, error);
      }
    }

    if (!this.running) return;
    if (this.tasks.size === 0) {
      this.stop();
      return;
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private handleTaskError(task: ScheduledTask, error: unknown): void {
    this.tasks.delete(task);
    window.setTimeout(() => {
      throw error;
    }, 0);
  }
}

export const globalScheduler = new FrameScheduler();
