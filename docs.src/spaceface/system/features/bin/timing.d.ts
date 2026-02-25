export declare const VERSION: "2.0.0";
export type CancellableFunction<T> = T & {
    cancel: () => void;
};
export declare function debounce<Args extends unknown[]>(func: (...args: Args) => void, delay?: number, immediate?: boolean): CancellableFunction<(...args: Args) => void>;
export declare function throttle<Args extends unknown[]>(func: (...args: Args) => void, delay?: number, options?: {
    leading?: boolean;
    trailing?: boolean;
}): CancellableFunction<(...args: Args) => void>;
