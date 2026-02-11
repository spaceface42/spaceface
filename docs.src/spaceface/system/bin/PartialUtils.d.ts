export declare const VERSION: "nextworld-1.3.0";
export declare function fetchPartialWithRetry(url: string, timeout?: number, retryAttempts?: number, cache?: Map<string, string>, debug?: boolean): Promise<string>;
export declare function insertHTML(container: ParentNode | Element, html: string, replace?: boolean, debug?: boolean): void;
export declare function showPartialError(container: ParentNode | Element, error: Error, debug?: boolean): void;
