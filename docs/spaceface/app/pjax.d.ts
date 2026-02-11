type PjaxOptions = {
    containerSelector?: string;
    linkSelector?: string;
    scrollToTop?: boolean;
    cache?: boolean;
};
export declare class Pjax {
    private containerSelector;
    private linkSelector;
    private scrollToTop;
    private cacheEnabled;
    private cache;
    private currentRequest?;
    constructor(options?: PjaxOptions);
    init(): void;
    destroy(): void;
    private onClick;
    private onPopState;
    load(url: string, pushState: boolean): Promise<void>;
}
export declare function initPjax(options?: PjaxOptions): Pjax;
export {};
