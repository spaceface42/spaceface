export declare const VERSION: "2.0.0";
import { AsyncImageLoaderOptions, ImageMetadataInterface, ImageLoadResultInterface } from '../../types/bin.js';
export declare class AsyncImageLoader {
    private container;
    private includePicture;
    private debug;
    private cache;
    private destroyed;
    constructor(container: Element, options?: AsyncImageLoaderOptions);
    private logDebug;
    private ensureActive;
    getImages(selector?: string): HTMLImageElement[];
    waitForImagesToLoad(selector?: string, includeFailed?: false): Promise<HTMLImageElement[]>;
    waitForImagesToLoad(selector: string, includeFailed: true): Promise<ImageLoadResultInterface[]>;
    getImageData(selector?: string): ImageMetadataInterface[];
    clearCache(): void;
    destroy(): void;
}
