import type { MotionImageEngineInterface } from '../../types/features.js';

import type { ImageMotionMode, MotionImageEngineOptionsInterface } from './types.js';

type MotionImageEngineClass = new (
    container: HTMLElement,
    options?: MotionImageEngineOptionsInterface
) => MotionImageEngineInterface;

const motionEngineClassCache = new Map<ImageMotionMode, MotionImageEngineClass>();

export async function loadMotionImageEngineClass(mode: ImageMotionMode): Promise<MotionImageEngineClass> {
    const cached = motionEngineClassCache.get(mode);
    if (cached) return cached;

    let EngineClass: MotionImageEngineClass;
    switch (mode) {
        case 'rain':
            EngineClass = (await import('./RainImageEngine.js')).RainImageEngine;
            break;
        case 'perlin-noise':
            EngineClass = (await import('./PerlinNoiseImageEngine.js')).PerlinNoiseImageEngine;
            break;
        case 'drift':
        default:
            EngineClass = (await import('./DriftImageEngine.js')).DriftImageEngine;
            break;
    }

    motionEngineClassCache.set(mode, EngineClass);
    return EngineClass;
}
