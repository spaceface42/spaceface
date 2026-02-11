export declare const VERSION: "nextworld-1.3.0";
import { WaitForElementOptions } from '../types/bin.js';
export declare class DomReadyPromise {
    #private;
    static ready(): Promise<void>;
    static waitForElement<T extends Element>(selectors: string | string[], options?: WaitForElementOptions): Promise<T | T[]>;
}
