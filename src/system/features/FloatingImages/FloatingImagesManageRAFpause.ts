export const VERSION = 'nextworld-1.2.1' as const;

import { FloatingImage } from './FloatingImage.js';
import { PerformanceMonitor } from '../bin/PerformanceMonitor.js';
import { resizeManager } from '../bin/ResizeManager.js';
import { AsyncImageLoader } from '../bin/AsyncImageLoader.js';
import { animationLoop } from '../bin/AnimationLoop.js';

import type {
    IFloatingImagesManagerOptions,
    IContainerDimensions,
    IFloatingImagesManager
} from '../../types/features.js';
type PauseReason = 'manual' | 'hidden' | 'inactivity';

export class FloatingImagesManager implements IFloatingImagesManager {
    readonly container: HTMLElement;
    performanceMonitor: PerformanceMonitor;
    images: FloatingImage[] = [];
    speedMultiplier: number = 1;
    isInViewport: boolean = true; // ← add this
    private _destroyed: boolean = false;
    private animateCallback: () => void;
    maxImages: number;
    intersectionObserver: IntersectionObserver;
    unsubscribeWindow?: () => void;
    unsubscribeElement?: () => void;
    imageLoader: AsyncImageLoader;
    containerWidth!: number;
    containerHeight!: number;
    debug: boolean;

    constructor(container: HTMLElement, options: IFloatingImagesManagerOptions = {}) {
        this.container = container;
        this.debug = options.debug ?? false;

        this.performanceMonitor = new PerformanceMonitor();
        const perfSettings = this.performanceMonitor.getRecommendedSettings();
        this.maxImages = options.maxImages ?? perfSettings.maxImages;

        this.intersectionObserver = new IntersectionObserver(entries => {
            const wasInViewport = this.isInViewport;
            this.isInViewport = entries[0].isIntersecting;

            // Pause/resume based on viewport visibility
            if (this.isInViewport && !wasInViewport) this.resumeLoop();
            else if (!this.isInViewport && wasInViewport) this.pauseLoop();
        }, { threshold: 0 });
        this.intersectionObserver.observe(this.container);

        this.setupResizeHandling();
        this.imageLoader = new AsyncImageLoader(this.container);
        this.updateContainerDimensions();

        this.animateCallback = () => this.animate();
        animationLoop.add(this.animateCallback); // always added initially
        if (this.debug) console.log('[FloatingImagesManager] RAF callback added');

        this.initializeImages();
    }

    private setupResizeHandling() {
        this.unsubscribeWindow = resizeManager.onWindow(() => this.handleResize());
        this.unsubscribeElement = resizeManager.onElement(this.container, () => this.handleResize());
    }

    private updateContainerDimensions() {
        const dims = resizeManager.getElement(this.container);
        this.containerWidth = dims.width;
        this.containerHeight = dims.height;
    }

    private async initializeImages() {
        try {
            const imgElements = await this.imageLoader.waitForImagesToLoad('.floating-image');
            const dims = { width: this.containerWidth, height: this.containerHeight };
            imgElements.slice(0, this.maxImages).forEach(el => this.addExistingImage(el, dims));
        } catch { /* ignore */ }
    }

    private addExistingImage(el: HTMLElement, dims: IContainerDimensions) {
        if (this.images.length >= this.maxImages) return;
        const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
        this.images.push(floatingImage);
    }

    private handleResize() {
        if (this._destroyed) return;
        this.updateContainerDimensions();
        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images.forEach(img => { img.updateSize(); img.clampPosition(dims); img.updatePosition(); });
    }

    private animate() {
        if (this._destroyed) return;

        const skipFrame = this.performanceMonitor.update();
        if (skipFrame || this.speedMultiplier === 0) return;

        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images = this.images.filter(img => img.update(this.speedMultiplier, dims));
    }

    private pauseLoop() {
        if (animationLoop.has(this.animateCallback)) {
            animationLoop.remove(this.animateCallback);
            if (this.debug) console.log('[FloatingImagesManager] RAF paused');
        }
    }

    private resumeLoop() {
        if (!animationLoop.has(this.animateCallback)) {
            animationLoop.add(this.animateCallback);
            if (this.debug) console.log('[FloatingImagesManager] RAF resumed');
        }
    }

    public resetAllImagePositions() {
        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images.forEach(img => img.resetPosition(dims));
    }

    public reinitializeImages() {
        if (this._destroyed) return;

        this.images.forEach(img => img.destroy());
        this.images.length = 0;

        const dims = { width: this.containerWidth, height: this.containerHeight };
        const imgElements = Array.from(this.container.querySelectorAll<HTMLElement>('.floating-image'))
            .slice(0, this.maxImages);

        imgElements.forEach(el => {
            const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
            this.images.push(floatingImage);
        });
    }

    destroy() {
        this._destroyed = true;
        this.pauseLoop();

        this.unsubscribeWindow?.();
        this.unsubscribeElement?.();
        this.intersectionObserver.disconnect();
        this.images.forEach(img => img.destroy());
        this.images.length = 0;
        this.imageLoader.destroy();
    }
}
