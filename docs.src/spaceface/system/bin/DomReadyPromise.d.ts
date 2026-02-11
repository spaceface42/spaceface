export declare const VERSION: "2.0.0";
import { WaitForElementOptions } from '../types/bin.js';
export declare class DomReadyPromise {
    #private;
    static ready(): Promise<void>;
    static waitForElement<T extends Element>(selectors: string | string[], options?: WaitForElementOptions): Promise<T | T[]>;
}
