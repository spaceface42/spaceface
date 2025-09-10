export const VERSION = 'nextworld-1.2.1';

type FrameCallback = () => void;

export class AnimationLoop {
    private callbacks: Set<FrameCallback> = new Set();
    private running = false;
    private _rafId: number | null = null;

    add(callback: FrameCallback) {
        if (!this.callbacks.has(callback)) this.callbacks.add(callback);
        this.start();
    }

    remove(callback: FrameCallback) {
        this.callbacks.delete(callback);
        if (this.callbacks.size === 0) this.stop();
    }

    has(callback: FrameCallback): boolean {
        return this.callbacks.has(callback);
    }

    private start() {
        if (this.running || this.callbacks.size === 0) return;
        this.running = true;
        this._loop();
    }

    private stop() {
        this.running = false;
        if (this._rafId !== null) cancelAnimationFrame(this._rafId);
        this._rafId = null;
    }

    pause() { this.stop(); }
    resume() { if (this.callbacks.size > 0) this.start(); }

    private _loop = () => {
        if (!this.running) return;
        for (const cb of this.callbacks) {
            try { cb(); } catch (err) { console.error('AnimationLoop callback error:', err); }
        }
        this._rafId = requestAnimationFrame(this._loop);
    };
}

export const animationLoop = new AnimationLoop();
