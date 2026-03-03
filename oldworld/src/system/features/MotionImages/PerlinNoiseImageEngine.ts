import { BaseImageEngine } from './MotionImageEngine.js';
import { PerlinNoiseImage } from './PerlinNoiseImage.js';

import type { ContainerDimensionsInterface, ImageMotionMode, MotionImageInterface } from './types.js';

export class PerlinNoiseImageEngine extends BaseImageEngine {
    protected readonly motionMode: ImageMotionMode = 'perlin-noise';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new PerlinNoiseImage(el, dims);
    }

    protected handleImageResize(img: MotionImageInterface, _dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.updatePosition();
    }
}
