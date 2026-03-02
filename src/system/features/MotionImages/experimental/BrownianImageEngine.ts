import { BaseImageEngine } from '../MotionImageEngine.js';
import { BrownianImage } from './BrownianImage.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from '../types.js';

export class BrownianImageEngine extends BaseImageEngine {
    protected readonly motionMode = 'brownian';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new BrownianImage(el, dims);
    }

    protected handleImageResize(img: MotionImageInterface, dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.clampPosition(dims);
        img.updatePosition();
    }
}
