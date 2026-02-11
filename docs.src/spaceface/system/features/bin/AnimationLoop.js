export const VERSION = '2.0.0';
export class AnimationLoop {
    callbacks = new Set();
    running = false;
    _rafId = null;
    errorHandler;
    constructor(errorHandler = console.error) {
        this.errorHandler = errorHandler;
    }
    add(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('AnimationLoop.add: Callback must be a function');
        }
        if (!this.callbacks.has(callback))
            this.callbacks.add(callback);
        this.start();
    }
    remove(callback) {
        this.callbacks.delete(callback);
        if (this.callbacks.size === 0)
            this.stop();
    }
    clear() {
        this.callbacks.clear();
        this.stop();
    }
    has(callback) {
        return this.callbacks.has(callback);
    }
    pause() {
        this.stop();
    }
    resume() {
        if (this.callbacks.size > 0)
            this.start();
    }
    start() {
        if (this.running || this.callbacks.size === 0)
            return;
        this.running = true;
        this._rafId = requestAnimationFrame(this._loop);
    }
    stop() {
        this.running = false;
        if (this._rafId !== null)
            cancelAnimationFrame(this._rafId);
        this._rafId = null;
    }
    _loop = () => {
        if (!this.running)
            return;
        for (const cb of Array.from(this.callbacks)) {
            try {
                cb();
            }
            catch (err) {
                this.errorHandler(err);
            }
        }
        this._rafId = requestAnimationFrame(this._loop);
    };
}
export const animationLoop = new AnimationLoop();
//# sourceMappingURL=AnimationLoop.js.map