import { BaseImageEngine } from '../MotionImageEngine.js';
import { WarpImage } from './WarpImage.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from '../types.js';

export class WarpImageEngine extends BaseImageEngine {
    protected readonly motionMode = 'warp';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new WarpImage(el, dims);
    }

    protected handleImageResize(img: MotionImageInterface, _dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.updatePosition();
    }
}
