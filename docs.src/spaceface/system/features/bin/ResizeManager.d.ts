export declare const VERSION: "2.0.0";
type WindowResizeCallback = () => void;
type ElementResizeCallback = (entry: ResizeObserverEntry) => void;
type ElementSize = {
    width: number;
    height: number;
};
export declare class ResizeManager {
    private windowCallbacks;
    private elementObservers;
    private debug;
    setDebugMode(enabled: boolean): void;
    private logDebug;
    private wrapCallback;
    onWindow(cb: WindowResizeCallback, options?: {
        debounceMs: number;
    }): () => void;
    onElement(el: Element, cb: ElementResizeCallback, options?: {
        debounceMs?: number;
        throttleMs?: number;
    }): () => void;
    getElement(el: Element): ElementSize;
    destroy(): void;
}
export declare const resizeManager: ResizeManager;
export {};
