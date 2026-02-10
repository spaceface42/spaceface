export declare const VERSION: "nextworld-1.3.0";
type WindowResizeCallback = () => void;
type ElementResizeCallback = (entry: ResizeObserverEntry) => void;
type ElementSize = {
    width: number;
    height: number;
};
export declare class ResizeManager {
    private windowCallbacks;
    private elementObservers;
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
