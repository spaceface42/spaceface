import { BaseImageEngine } from './MotionImageEngine.js';
import { RainImage } from './RainImage.js';

import type { ContainerDimensionsInterface, ImageMotionMode, MotionImageInterface } from './types.js';

export class RainImageEngine extends BaseImageEngine {
    protected readonly motionMode: ImageMotionMode = 'rain';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new RainImage(el, dims);
    }

    protected handleImageResize(img: MotionImageInterface, _dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.updatePosition();
    }
}
