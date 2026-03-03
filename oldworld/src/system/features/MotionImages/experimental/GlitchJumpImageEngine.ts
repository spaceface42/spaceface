import { BaseImageEngine } from '../MotionImageEngine.js';
import { GlitchJumpImage } from './GlitchJumpImage.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from '../types.js';

export class GlitchJumpImageEngine extends BaseImageEngine {
    protected readonly motionMode = 'glitch-jump';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new GlitchJumpImage(el, dims);
    }

    protected handleImageResize(img: MotionImageInterface, dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.clampPosition(dims);
        img.updatePosition();
    }
}
