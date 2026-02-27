import { clamp } from '../bin/math.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from './types.js';

const MIN_JUMP_FRAMES = 18;
const MAX_JUMP_FRAMES = 80;

export class GlitchJumpImage implements MotionImageInterface {
    private element: HTMLElement | null;
    private size: { width: number; height: number };
    private x: number;
    private y: number;
    private scale: number;
    private glitchBoost: number;
    private framesUntilJump: number;
    private phase: number;
    private readonly useSubpixel: boolean;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: { useSubpixel?: boolean } = {}) {
        this.element = element;
        this.useSubpixel = options.useSubpixel ?? true;
        this.size = { width: element.offsetWidth, height: element.offsetHeight };
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.scale = 1;
        this.glitchBoost = 0;
        this.framesUntilJump = this.randomJumpFrames();
        this.phase = Math.random() * Math.PI * 2;

        element.style.willChange = 'transform';
        element.style.backfaceVisibility = 'hidden';
        element.style.perspective = '1000px';
        element.style.opacity = '1';
        this.updatePosition();
    }

    updatePosition(): boolean {
        if (!this.element) return false;
        const tremorX = Math.cos(this.phase * 3.1) * 0.7;
        const tremorY = Math.sin(this.phase * 2.7) * 0.7;
        const xRaw = this.x + tremorX;
        const yRaw = this.y + tremorY;
        const x = this.useSubpixel ? xRaw : Math.round(xRaw);
        const y = this.useSubpixel ? yRaw : Math.round(yRaw);
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${this.scale})`;
        return true;
    }

    getElement(): HTMLElement | null {
        return this.element;
    }

    update(multiplier: number, dims: ContainerDimensionsInterface, applyPosition = true): boolean {
        if (!this.element) return false;

        this.phase += 0.05 * Math.max(0.2, multiplier);
        this.framesUntilJump -= 1;

        // Micro-jitter while idle.
        this.x += (Math.random() - 0.5) * 0.12 * multiplier;
        this.y += (Math.random() - 0.5) * 0.12 * multiplier;
        this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
        this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));

        if (this.framesUntilJump <= 0) {
            this.x = Math.random() * Math.max(0, dims.width - this.size.width);
            this.y = Math.random() * Math.max(0, dims.height - this.size.height);
            this.glitchBoost = 0.24 + Math.random() * 0.42;
            this.framesUntilJump = this.randomJumpFrames();
        }

        this.glitchBoost *= 0.82;
        this.scale = 1 + this.glitchBoost;

        return applyPosition ? this.updatePosition() : true;
    }

    resetPosition(dims: ContainerDimensionsInterface): void {
        this.x = Math.random() * Math.max(0, dims.width - this.size.width);
        this.y = Math.random() * Math.max(0, dims.height - this.size.height);
        this.scale = 1;
        this.glitchBoost = 0;
        this.framesUntilJump = this.randomJumpFrames();
        this.updatePosition();
    }

    updateSize(): void {
        if (!this.element) return;
        this.size.width = this.element.offsetWidth;
        this.size.height = this.element.offsetHeight;
    }

    clampPosition(dims: ContainerDimensionsInterface): void {
        this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
        this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));
    }

    destroy(): void {
        if (!this.element) return;
        this.element.style.willChange = 'auto';
        this.element.style.backfaceVisibility = '';
        this.element.style.perspective = '';
        this.element = null;
    }

    private randomJumpFrames(): number {
        return Math.floor(Math.random() * (MAX_JUMP_FRAMES - MIN_JUMP_FRAMES + 1)) + MIN_JUMP_FRAMES;
    }
}
