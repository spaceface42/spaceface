import { clamp } from '../bin/math.js';

import type { ContainerDimensionsInterface, MotionImageInterface } from './types.js';

const MIN_HOLD_FRAMES = 24;
const MAX_HOLD_FRAMES = 90;
const TRANSITION_SPEED = 0.06;

export class PulseGridImage implements MotionImageInterface {
    private element: HTMLElement | null;
    private size: { width: number; height: number };
    private x: number;
    private y: number;
    private fromX: number;
    private fromY: number;
    private toX: number;
    private toY: number;
    private transitionProgress: number;
    private holdFrames: number;
    private pulsePhase: number;
    private pulseSpeed: number;
    private scale: number;
    private readonly useSubpixel: boolean;

    constructor(element: HTMLElement, dims: ContainerDimensionsInterface, options: { useSubpixel?: boolean } = {}) {
        this.element = element;
        this.useSubpixel = options.useSubpixel ?? true;
        this.size = { width: element.offsetWidth, height: element.offsetHeight };
        this.x = 0;
        this.y = 0;
        this.fromX = 0;
        this.fromY = 0;
        this.toX = 0;
        this.toY = 0;
        this.transitionProgress = 1;
        this.holdFrames = this.randomHoldFrames();
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.04 + Math.random() * 0.05;
        this.scale = 1;

        const spawn = this.getRandomGridPosition(dims);
        this.x = spawn.x;
        this.y = spawn.y;
        this.fromX = spawn.x;
        this.fromY = spawn.y;
        this.toX = spawn.x;
        this.toY = spawn.y;

        element.style.willChange = 'transform';
        element.style.backfaceVisibility = 'hidden';
        element.style.perspective = '1000px';
        element.style.opacity = '1';
        this.updatePosition();
    }

    updatePosition(): boolean {
        if (!this.element) return false;
        const x = this.useSubpixel ? this.x : Math.round(this.x);
        const y = this.useSubpixel ? this.y : Math.round(this.y);
        this.element.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${this.scale})`;
        return true;
    }

    getElement(): HTMLElement | null {
        return this.element;
    }

    update(multiplier: number, dims: ContainerDimensionsInterface, applyPosition = true): boolean {
        if (!this.element) return false;

        this.pulsePhase += this.pulseSpeed * Math.max(0.2, multiplier);
        this.scale = 0.86 + (Math.sin(this.pulsePhase) * 0.18 + Math.sin(this.pulsePhase * 0.5) * 0.04);

        if (this.transitionProgress < 1) {
            this.transitionProgress = Math.min(1, this.transitionProgress + TRANSITION_SPEED * multiplier);
            this.x = this.fromX + (this.toX - this.fromX) * this.transitionProgress;
            this.y = this.fromY + (this.toY - this.fromY) * this.transitionProgress;
        } else {
            this.holdFrames -= Math.max(0.2, multiplier);
            if (this.holdFrames <= 0) {
                this.startTransition(dims);
            }
        }

        this.x = clamp(this.x, 0, Math.max(0, dims.width - this.size.width));
        this.y = clamp(this.y, 0, Math.max(0, dims.height - this.size.height));

        return applyPosition ? this.updatePosition() : true;
    }

    resetPosition(dims: ContainerDimensionsInterface): void {
        const spawn = this.getRandomGridPosition(dims);
        this.x = spawn.x;
        this.y = spawn.y;
        this.fromX = spawn.x;
        this.fromY = spawn.y;
        this.toX = spawn.x;
        this.toY = spawn.y;
        this.transitionProgress = 1;
        this.holdFrames = this.randomHoldFrames();
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
        this.fromX = clamp(this.fromX, 0, Math.max(0, dims.width - this.size.width));
        this.fromY = clamp(this.fromY, 0, Math.max(0, dims.height - this.size.height));
        this.toX = clamp(this.toX, 0, Math.max(0, dims.width - this.size.width));
        this.toY = clamp(this.toY, 0, Math.max(0, dims.height - this.size.height));
    }

    destroy(): void {
        if (!this.element) return;
        this.element.style.willChange = 'auto';
        this.element.style.backfaceVisibility = '';
        this.element.style.perspective = '';
        this.element = null;
    }

    private startTransition(dims: ContainerDimensionsInterface): void {
        this.fromX = this.x;
        this.fromY = this.y;
        const target = this.getNearbyGridPosition(dims);
        this.toX = target.x;
        this.toY = target.y;
        this.transitionProgress = 0;
        this.holdFrames = this.randomHoldFrames();
    }

    private getRandomGridPosition(dims: ContainerDimensionsInterface): { x: number; y: number } {
        const columns = this.getGridColumns(dims.width);
        const rows = this.getGridRows(dims.height);
        const columnIndex = Math.floor(Math.random() * columns);
        const rowIndex = Math.floor(Math.random() * rows);
        return this.getGridPositionFromIndex(dims, columnIndex, rowIndex);
    }

    private getNearbyGridPosition(dims: ContainerDimensionsInterface): { x: number; y: number } {
        const columns = this.getGridColumns(dims.width);
        const rows = this.getGridRows(dims.height);
        const stepX = this.getGridStepX();
        const stepY = this.getGridStepY();

        const currentColumn = clamp(Math.round(this.x / stepX), 0, Math.max(0, columns - 1));
        const currentRow = clamp(Math.round(this.y / stepY), 0, Math.max(0, rows - 1));
        const deltaColumn = Math.floor(Math.random() * 5) - 2;
        const deltaRow = Math.floor(Math.random() * 5) - 2;

        const nextColumn = clamp(currentColumn + deltaColumn, 0, Math.max(0, columns - 1));
        const nextRow = clamp(currentRow + deltaRow, 0, Math.max(0, rows - 1));
        return this.getGridPositionFromIndex(dims, nextColumn, nextRow);
    }

    private getGridPositionFromIndex(
        dims: ContainerDimensionsInterface,
        columnIndex: number,
        rowIndex: number
    ): { x: number; y: number } {
        const maxX = Math.max(0, dims.width - this.size.width);
        const maxY = Math.max(0, dims.height - this.size.height);
        const columns = this.getGridColumns(dims.width);
        const rows = this.getGridRows(dims.height);

        // Spread grid anchors across the full drawable range so edge cells
        // can reach both the right and bottom bounds.
        const x = columns <= 1 ? 0 : (columnIndex / (columns - 1)) * maxX;
        const y = rows <= 1 ? 0 : (rowIndex / (rows - 1)) * maxY;
        return { x, y };
    }

    private getGridColumns(width: number): number {
        const maxX = Math.max(0, width - this.size.width);
        return Math.max(1, Math.floor(maxX / this.getGridStepX()) + 1);
    }

    private getGridRows(height: number): number {
        const maxY = Math.max(0, height - this.size.height);
        return Math.max(1, Math.floor(maxY / this.getGridStepY()) + 1);
    }

    private getGridStepX(): number {
        return Math.max(48, this.size.width * 1.35);
    }

    private getGridStepY(): number {
        return Math.max(48, this.size.height * 1.35);
    }

    private randomHoldFrames(): number {
        return Math.floor(Math.random() * (MAX_HOLD_FRAMES - MIN_HOLD_FRAMES + 1)) + MIN_HOLD_FRAMES;
    }
}
