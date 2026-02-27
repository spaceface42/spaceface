// src/spaceface/features/MotionImages/MotionImage.ts


import { clamp } from '../bin/math.js';
import { createImageMotion } from './createImageMotion.js';

import type {
    ContainerDimensionsInterface,
    ImageMotionInterface,
    MotionImageOptionsInterface,
    ImageMotionStateInterface
} from './types.js';

export class MotionImage {
    private element: HTMLElement | null;
    private state: ImageMotionStateInterface;
    private motion: ImageMotionInterface;
    private options: Required<MotionImageOptionsInterface>;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: MotionImageOptionsInterface = {}) {
        this.element = element;
        this.options = { useSubpixel: true, debug: false, motionMode: 'drift', ...options };
        this.state = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            size: { width: element.offsetWidth, height: element.offsetHeight }
        };
        this.motion = createImageMotion(this.options.motionMode);
        this.motion.initialize(this.state, dims);

        element.style.willChange = 'transform';
        element.style.backfaceVisibility = 'hidden';
        element.style.perspective = '1000px';
        element.style.opacity = '1';

        this.updatePosition();
    }

    private logDebug(message: string, data?: unknown): void {
        if (this.options.debug) {
            console.debug(`[MotionImage] ${message}`, data);
        }
    }

    updatePosition(): boolean {
        if (!this.element) {
            this.logDebug("updatePosition called on destroyed element");
            return false;
        }
        const x = this.options.useSubpixel ? this.state.x : Math.round(this.state.x);
        const y = this.options.useSubpixel ? this.state.y : Math.round(this.state.y);
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        this.logDebug("Position updated", { x, y });
        return true;
    }

    getElement(): HTMLElement | null {
        return this.element;
    }

    update(multiplier: number, dims: ContainerDimensionsInterface, applyPosition = true): boolean {
        if (!this.element) {
            this.logDebug("update called on destroyed element");
            return false;
        }

        this.state.x += this.state.vx * multiplier;
        this.state.y += this.state.vy * multiplier;
        this.motion.step(this.state, dims);

        if (applyPosition) return this.updatePosition();
        return true;
    }

    resetPosition(dims: ContainerDimensionsInterface) {
        this.motion.reset(this.state, dims);
        this.updatePosition(); // must be called
    }


    updateSize() {
        if (!this.element) return;
        this.state.size.width = this.element.offsetWidth;
        this.state.size.height = this.element.offsetHeight;
    }

    clampPosition(dims: ContainerDimensionsInterface) {
        this.state.x = clamp(this.state.x, 0, Math.max(0, dims.width - this.state.size.width));
        this.state.y = clamp(this.state.y, 0, Math.max(0, dims.height - this.state.size.height));
    }

    destroy() {
        if (!this.element) return;
        this.element.style.willChange = 'auto';
        this.element.style.backfaceVisibility = '';
        this.element.style.perspective = '';
        this.element = null;
    }
}
