import { BaseImageEngine } from '../MotionImageEngine.js';
import { ParallaxDriftImage } from './ParallaxDriftImage.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from '../types.js';

export class ParallaxDriftImageEngine extends BaseImageEngine {
    protected readonly motionMode = 'parallax-drift';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new ParallaxDriftImage(el, dims, { debug: this.debug });
    }

    protected handleImageResize(img: MotionImageInterface, dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.clampPosition(dims);
        img.updatePosition();
    }
}
