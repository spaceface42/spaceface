import { BaseImageEngine } from './MotionImageEngine.js';
import { PulseGridImage } from './PulseGridImage.js';

import type { ContainerDimensionsInterface, ImageMotionMode, MotionImageInterface } from './types.js';

export class PulseGridImageEngine extends BaseImageEngine {
    protected readonly motionMode: ImageMotionMode = 'pulse-grid';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new PulseGridImage(el, dims);
    }

    protected handleImageResize(img: MotionImageInterface, dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.clampPosition(dims);
        img.updatePosition();
    }
}
