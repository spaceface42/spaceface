import { DriftImage } from './DriftImage.js';
import { BaseImageEngine } from './MotionImageEngine.js';

import type { ContainerDimensionsInterface, ImageMotionMode, MotionImageInterface } from './types.js';

export class DriftImageEngine extends BaseImageEngine {
    protected readonly motionMode: ImageMotionMode = 'drift';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new DriftImage(el, dims, { debug: this.debug });
    }

    protected handleImageResize(img: MotionImageInterface, dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.clampPosition(dims);
        img.updatePosition();
    }
}
