export declare const VERSION: "2.0.0";
type FrameCallback = () => void;
export declare class AnimationLoop {
    private callbacks;
    private running;
    private _rafId;
    private errorHandler;
    constructor(errorHandler?: (error: unknown) => void);
    add(callback: FrameCallback): void;
    remove(callback: FrameCallback): void;
    clear(): void;
    has(callback: FrameCallback): boolean;
    pause(): void;
    resume(): void;
    private start;
    private stop;
    private _loop;
}
export declare const animationLoop: AnimationLoop;
export {};
