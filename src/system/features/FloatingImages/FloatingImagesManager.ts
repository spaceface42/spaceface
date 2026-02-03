// src/spaceface/features/FloatingImages/FloatingImagesManager.ts

export const VERSION = 'nextworld-1.3.0' as const;

import { FloatingImage } from './FloatingImage.js';
import { PerformanceMonitor } from '../bin/PerformanceMonitor.js';
import { resizeManager } from '../bin/ResizeManager.js';
import { AsyncImageLoader } from '../bin/AsyncImageLoader.js';
import { animationLoop } from '../bin/AnimationLoop.js';
import { eventBus } from '../../bin/EventBus.js';
import { debounce } from '../bin/timing.js';

import type {
    FloatingImagesManagerOptionsInterface,
    ContainerDimensionsInterface,
    FloatingImagesManagerInterface
} from '../../types/features.js';

export class FloatingImagesManager implements FloatingImagesManagerInterface {
    readonly container: HTMLElement;
    performanceMonitor: PerformanceMonitor;
    images: FloatingImage[] = [];
    speedMultiplier: number = 1;
    isInViewport: boolean = true;
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

    constructor(container: HTMLElement, options: FloatingImagesManagerOptionsInterface = {}) {
        this.container = container;
        this.debug = options.debug ?? false;

        this.performanceMonitor = new PerformanceMonitor();
        const perfSettings = this.performanceMonitor.getRecommendedSettings();
        this.maxImages = options.maxImages ?? perfSettings.maxImages;

        this.intersectionObserver = new IntersectionObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            this.isInViewport = !!entry.isIntersecting;
        }, { threshold: 0 });
        this.intersectionObserver.observe(this.container);

        this.setupResizeHandling();
        this.imageLoader = new AsyncImageLoader(this.container);
        this.updateContainerDimensions();

        this.animateCallback = () => this.animate();

        // Only add callback if not already in AnimationLoop
        if (!animationLoop.has(this.animateCallback)) {
            animationLoop.add(this.animateCallback);
        }

        this.initializeImages();
        this.log('info', 'FloatingImagesManager initialized', {
            container: this.container,
            maxImages: this.maxImages
        });
    }

    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) {
        if (!this.debug && level === 'debug') return;

        const payload = { scope: 'FloatingImagesManager', level, message, data, time: Date.now() };
        eventBus.emit('floatingImages:log', { level, message, data });
        eventBus.emit('log', payload);

        if (this.debug) {
            const consoleMethodMap: Record<'debug' | 'info' | 'warn' | 'error', keyof Console> = {
                debug: 'debug',
                info: 'info',
                warn: 'warn',
                error: 'error',
            };
            const method = consoleMethodMap[level] ?? 'log';
            (console as any)[method](`[FloatingImagesManager] [${level.toUpperCase()}]`, message, data);
        }
    }

    private setupResizeHandling() {
        this.unsubscribeWindow = resizeManager.onWindow(() => this.handleResize());
        this.unsubscribeElement = resizeManager.onElement(this.container, () => this.handleResize());
    }

    private updateContainerDimensions() {
        if (!this.container.isConnected) {
            this.containerWidth = 0;
            this.containerHeight = 0;
            this.log('warn', 'Container is not in the DOM, dimensions set to 0');
            return;
        }
        const dims = resizeManager.getElement(this.container);
        this.containerWidth = dims.width;
        this.containerHeight = dims.height;
    }

    private async initializeImages() {
        try {
            const imgElements = await this.imageLoader.waitForImagesToLoad('.floating-image');
            const dims = { width: this.containerWidth, height: this.containerHeight };
            // if destroyed while awaiting, avoid adding images
            imgElements.slice(0, this.maxImages).forEach(el => {
                if (this._destroyed) return;
                this.addExistingImage(el, dims);
            });
            this.log('info', 'Images initialized', { count: this.images.length });
        } catch (err) {
            this.log('error', 'Failed to initialize images', err);
        }
    }

    private addExistingImage(el: HTMLElement, dims: ContainerDimensionsInterface) {
        if (this.images.length >= this.maxImages) return;
        const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
        this.images.push(floatingImage);
    }

    private handleResize = debounce(() => {
        try {
            if (this._destroyed) return;
            if (!this.container.isConnected) {
                this.log('warn', 'Resize event ignored, container not in DOM');
                return;
            }
            this.updateContainerDimensions();
            const dims = { width: this.containerWidth, height: this.containerHeight };
            this.images.forEach(img => {
                img.updateSize();
                img.clampPosition(dims);
                img.updatePosition();
            });
            this.log('debug', 'Container resized', dims);
        } catch (error) {
            this.log('error', 'Error during handleResize', error);
        }
    }, 200);

    private animate() {
        if (this._destroyed) return;

        const skipFrame = this.performanceMonitor.update();
        if (skipFrame || !this.isInViewport || this.speedMultiplier === 0) return;

        const multiplier = this.speedMultiplier;
        const dims = { width: this.containerWidth, height: this.containerHeight };

        this.images = this.images.filter(img => img.update(multiplier, dims));
    }

    public resetAllImagePositions() {
        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images.forEach(img => img.resetPosition(dims));
        this.log('debug', 'All image positions reset', dims);
    }

    public reinitializeImages() {
        try {
            if (this._destroyed) return;
            if (!this.container.isConnected) {
                this.log('warn', 'reinitializeImages: container not in DOM, skipping');
                return;
            }

            this.images.forEach(img => img.destroy());
            this.images.length = 0;

            const dims = { width: this.containerWidth, height: this.containerHeight };
            const imgElements = Array.from(this.container.querySelectorAll<HTMLElement>('.floating-image'))
                .slice(0, this.maxImages);

            imgElements.forEach(el => {
                const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
                this.images.push(floatingImage);
            });

            this.log('info', 'Images reinitialized', { count: this.images.length });
        } catch (error) {
            this.log('error', 'Error during reinitializeImages', error);
        }
    }

    destroy() {
        if (this._destroyed) return;

        this._destroyed = true;

        if (animationLoop.has(this.animateCallback)) {
            animationLoop.remove(this.animateCallback);
        }

        this.unsubscribeWindow?.();
        this.unsubscribeElement?.();
        // clear unsubscribe refs to avoid keeping closures alive
        this.unsubscribeWindow = undefined;
        this.unsubscribeElement = undefined;

        this.intersectionObserver.disconnect();
        this.images.forEach(img => img.destroy());
        this.images.length = 0;
        this.imageLoader.destroy();

        // reset container dims
        this.containerWidth = 0;
        this.containerHeight = 0;

        this.log('info', 'FloatingImagesManager destroyed');
    }
}
