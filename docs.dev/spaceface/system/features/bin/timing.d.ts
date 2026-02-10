export declare const VERSION: "nextworld-1.3.0";
export type CancellableFunction<T extends (...args: any[]) => void> = T & {
    cancel: () => void;
};
export declare function debounce<T extends (...args: any[]) => void>(func: T, delay?: number, immediate?: boolean): CancellableFunction<(...args: Parameters<T>) => void>;
export declare function throttle<T extends (...args: any[]) => void>(func: T, delay?: number, options?: {
    leading?: boolean;
    trailing?: boolean;
}): CancellableFunction<(...args: Parameters<T>) => void>;
