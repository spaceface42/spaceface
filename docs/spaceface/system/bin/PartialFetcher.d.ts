export declare const VERSION: "2.0.0";
import type { PartialFetchOptionsInterface, PartialLoaderLike } from "../types/bin.js";
export declare class PartialFetcher {
    private static loader;
    private static getLoader;
    private static logDebug;
    static load(url: string, targetSelector: string, options?: PartialFetchOptionsInterface): Promise<void>;
    static preload(urls: string[], loader?: PartialLoaderLike): Promise<void[]>;
    static watch(container?: HTMLElement | Document, loader?: PartialLoaderLike): unknown;
}
