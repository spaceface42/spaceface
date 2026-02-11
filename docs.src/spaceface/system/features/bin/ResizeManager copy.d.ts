export declare const VERSION: "nextworld-1.2.0";
type ResizeCallback = () => void;
type ElementSize = {
    width: number;
    height: number;
};
export declare class ResizeManager {
    private windowCallbacks;
    private elementObservers;
    onWindow(cb: ResizeCallback, options?: {
        debounceMs?: number;
        throttleMs?: number;
    }): () => void;
    onElement(el: Element, cb: ResizeCallback, options?: {
        debounceMs?: number;
        throttleMs?: number;
    }): () => void;
    getElement(el: Element): ElementSize;
    destroy(): void;
}
export declare const resizeManager: ResizeManager;
export {};
