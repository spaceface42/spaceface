// src/spaceface/system/features/bin/AnimationLoop.ts

export const VERSION = '2.0.0' as const;

type FrameCallback = () => void;

/**
 * Manages a loop of animation frames, allowing callbacks to be added and removed dynamically.
 * Ensures safe execution of callbacks and handles errors gracefully.
 */
export class AnimationLoop {
    private callbacks: Set<FrameCallback> = new Set();
    private running = false;
    private _rafId: number | null = null;
    private errorHandler: (error: unknown) => void;

    constructor(errorHandler: (error: unknown) => void = console.error) {
        this.errorHandler = errorHandler;
    }

    /**
     * Adds a callback to the animation loop.
     * Starts the loop if it is not already running.
     *
     * @param callback - The function to be called on each animation frame.
     */
    add(callback: FrameCallback): void {
        if (typeof callback !== 'function') {
            throw new TypeError('AnimationLoop.add: Callback must be a function');
        }
        if (!this.callbacks.has(callback)) this.callbacks.add(callback);
        this.start();
    }

    /**
     * Removes a callback from the animation loop.
     * Stops the loop if no callbacks remain.
     *
     * @param callback - The function to be removed.
     */
    remove(callback: FrameCallback): void {
        this.callbacks.delete(callback);
        if (this.callbacks.size === 0) this.stop();
    }

    /**
     * Removes all callbacks from the animation loop.
     * Stops the loop if it is running.
     */
    clear(): void {
        this.callbacks.clear();
        this.stop();
    }

    /**
     * Checks if a callback is currently in the animation loop.
     *
     * @param callback - The function to check.
     * @returns True if the callback is in the loop, false otherwise.
     */
    has(callback: FrameCallback): boolean {
        return this.callbacks.has(callback);
    }

    /**
     * Pauses the animation loop, stopping all callbacks temporarily.
     * This is equivalent to calling `stop` but does not clear callbacks.
     */
    pause(): void {
        this.stop();
    }

    /**
     * Resumes the animation loop if there are callbacks to execute.
     */
    resume(): void {
        if (this.callbacks.size > 0) this.start();
    }

    /**
     * Starts the animation loop if it is not already running.
     * Private method to ensure controlled access.
     */
    private start(): void {
        if (this.running || this.callbacks.size === 0) return;
        this.running = true;
        // Schedule the first frame rather than invoking immediately
        this._rafId = requestAnimationFrame(this._loop);
    }

    /**
     * Stops the animation loop and cancels the next frame.
     * Private method to ensure controlled access.
     */
    private stop(): void {
        this.running = false;
        if (this._rafId !== null) cancelAnimationFrame(this._rafId);
        this._rafId = null;
    }

    /**
     * The main loop function, executed on each animation frame.
     * Iterates over a snapshot of callbacks to allow safe modification during execution.
     */
    private _loop = (): void => {
        if (!this.running) return;
        for (const cb of Array.from(this.callbacks)) {
            try {
                cb();
            } catch (err) {
                this.errorHandler(err);
            }
        }
        this._rafId = requestAnimationFrame(this._loop);
    };
}

/**
 * A shared instance of the AnimationLoop class for global use.
 */
export const animationLoop = new AnimationLoop();
