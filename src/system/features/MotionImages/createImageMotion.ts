import { DriftMotion } from './DriftMotion.js';
import { RainMotion } from './RainMotion.js';

import type { ImageMotionInterface, ImageMotionMode } from './types.js';

export function createImageMotion(mode: ImageMotionMode): ImageMotionInterface {
    if (mode === 'rain') return new RainMotion();
    return new DriftMotion();
}
