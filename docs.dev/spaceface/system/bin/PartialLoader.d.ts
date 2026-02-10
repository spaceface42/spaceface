export declare const VERSION: "nextworld-1.3.0";
import { PartialLoaderOptionsInterface, PartialLoadResultInterface, PartialInfoInterface } from "../types/bin.js";
export declare class PartialLoader {
    private cache;
    private loadingPromises;
    private loadedPartials;
    private options;
    constructor(options?: PartialLoaderOptionsInterface);
    private logDebug;
    load(input: HTMLLinkElement | PartialInfoInterface | (HTMLLinkElement | PartialInfoInterface)[]): Promise<PartialLoadResultInterface[]>;
    private loadLink;
    private loadInfo;
    private loadUrl;
    private fetchWithRetry;
    private fetchPartial;
    private insertHTML;
    private showError;
    isPartialLoaded(id: string): boolean;
    private resolveUrl;
    private delay;
    loadContainer(container?: ParentNode): Promise<PartialLoadResultInterface[]>;
    watch(container?: HTMLElement | Document): MutationObserver | undefined;
    fetchWithLoaderCache(url: string): Promise<string>;
}
