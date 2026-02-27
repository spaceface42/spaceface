// src/spaceface/features/MotionImages/MotionImageEngine.ts


import { BrownianImage } from './BrownianImage.js';
import { DriftImage } from './DriftImage.js';
import { ParallaxDriftImage } from './ParallaxDriftImage.js';
import { RainImage } from './RainImage.js';
import { WarpImage } from './WarpImage.js';
import { PerformanceMonitor } from '../bin/PerformanceMonitor.js';
import { resizeManager } from '../bin/ResizeManager.js';
import { AsyncImageLoader } from '../bin/AsyncImageLoader.js';
import { animationLoop } from '../bin/AnimationLoop.js';
import { eventBus } from '../../bin/EventBus.js';
import { debounce } from '../bin/timing.js';
import { AnimationPolicy } from '../bin/AnimationPolicy.js';
import type { LogPayload } from '../../types/bin.js';
import { EVENTS } from '../../types/events.js';

import type {
    MotionImageInterface,
    MotionImageEngineOptionsInterface,
    ContainerDimensionsInterface,
    ImageMotionMode
} from './types.js';
import type { MotionImageEngineInterface } from '../../types/features.js';

export abstract class BaseImageEngine implements MotionImageEngineInterface {
    readonly container: HTMLElement;
    performanceMonitor: PerformanceMonitor;
    images: MotionImageInterface[] = [];
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
    hoverBehavior: 'none' | 'slow' | 'stop';
    hoverSlowMultiplier: number;
    tapToFreeze: boolean;
    pauseOnScreensaver: boolean;
    protected abstract readonly motionMode: ImageMotionMode;
    private interactionCleanups: Array<() => void> = [];
    private frozenElements = new WeakSet<HTMLElement>();
    private imageSpeedOverrides = new WeakMap<HTMLElement, number>();
    private unsubScreensaverShown?: () => void;
    private unsubScreensaverHidden?: () => void;
    private unbindVisibility?: () => void;
    private pausedByScreensaver = false;
    private speedBeforeScreensaver = 1;
    private animationPolicy = new AnimationPolicy();

    constructor(container: HTMLElement, options: MotionImageEngineOptionsInterface = {}) {
        this.container = container;
        this.debug = options.debug ?? false;
        this.hoverBehavior = options.hoverBehavior ?? 'none';
        this.hoverSlowMultiplier = options.hoverSlowMultiplier ?? 0.2;
        this.tapToFreeze = options.tapToFreeze ?? true;
        this.pauseOnScreensaver = options.pauseOnScreensaver ?? false;

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
        this.setupScreensaverHandling();
        this.imageLoader = new AsyncImageLoader(this.container);
        this.updateContainerDimensions();

        this.animateCallback = () => this.animate();

        // Only add callback if not already in AnimationLoop
        if (!animationLoop.has(this.animateCallback)) {
            animationLoop.add(this.animateCallback);
        }

        this.initializeImages();
        this.log('info', `${this.constructor.name} initialized`, {
            container: this.container,
            maxImages: this.maxImages
        });
    }

    private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) {
        if (!this.debug && level === 'debug') return;

        const scope = this.constructor.name || 'BaseImageEngine';
        const payload: LogPayload = { scope, level, message, data, time: Date.now() };
        eventBus.emit(EVENTS.MOTION_IMAGES_LOG, { level, message, data });
        eventBus.emit(EVENTS.LOG, payload);

        if (this.debug) {
            switch (level) {
                case 'debug':
                    console.debug(`[${scope}] [${level.toUpperCase()}]`, message, data);
                    break;
                case 'info':
                    console.info(`[${scope}] [${level.toUpperCase()}]`, message, data);
                    break;
                case 'warn':
                    console.warn(`[${scope}] [${level.toUpperCase()}]`, message, data);
                    break;
                case 'error':
                    console.error(`[${scope}] [${level.toUpperCase()}]`, message, data);
                    break;
            }
        }
    }

    private setupResizeHandling() {
        this.unsubscribeWindow = resizeManager.onWindow(() => this.handleResize());
        this.unsubscribeElement = resizeManager.onElement(this.container, () => this.handleResize());
    }

    private setupScreensaverHandling() {
        if (!this.pauseOnScreensaver) return;

        this.unsubScreensaverShown = eventBus.on(EVENTS.SCREENSAVER_SHOWN, () => {
            if (this.pausedByScreensaver) return;
            this.speedBeforeScreensaver = this.speedMultiplier;
            this.speedMultiplier = 0;
            this.pausedByScreensaver = true;
            this.animationPolicy.set('screensaver', true);
            this.log('debug', 'Paused due to screensaver');
        });

        this.unsubScreensaverHidden = eventBus.on(EVENTS.SCREENSAVER_HIDDEN, () => {
            if (!this.pausedByScreensaver) return;
            this.speedMultiplier = this.speedBeforeScreensaver;
            this.pausedByScreensaver = false;
            this.animationPolicy.set('screensaver', false);
            this.log('debug', 'Resumed after screensaver');
        });

        const onVisibilityChange = () => {
            this.animationPolicy.set('hidden', document.visibilityState === 'hidden');
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        this.unbindVisibility = () => document.removeEventListener('visibilitychange', onVisibilityChange);
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
        const floatingImage = this.createImage(el, dims);
        this.images.push(floatingImage);
        this.bindImageInteraction(el);
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
                this.handleImageResize(img, dims);
            });
            this.log('debug', 'Container resized', dims);
        } catch (error) {
            this.log('error', 'Error during handleResize', error);
        }
    }, 200);

    private animate() {
        if (this._destroyed) return;

        if (!this.isInViewport || this.speedMultiplier === 0 || this.animationPolicy.isPaused()) return;

        const skipFrame = this.performanceMonitor.update();
        if (skipFrame) return;

        const multiplier = this.speedMultiplier;
        const dims = { width: this.containerWidth, height: this.containerHeight };

        this.images = this.images.filter(img => {
            const el = img.getElement();
            const imageMultiplier = el ? (this.imageSpeedOverrides.get(el) ?? multiplier) : multiplier;
            if (imageMultiplier <= 0) {
                return img.updatePosition();
            }
            return img.update(imageMultiplier, dims);
        });
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
            this.unbindImageInteractions();

            const dims = { width: this.containerWidth, height: this.containerHeight };
            const imgElements = Array.from(this.container.querySelectorAll<HTMLElement>('.floating-image'))
                .slice(0, this.maxImages);

            imgElements.forEach(el => {
                const floatingImage = this.createImage(el, dims);
                this.images.push(floatingImage);
                this.bindImageInteraction(el);
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
        this.unsubScreensaverShown?.();
        this.unsubScreensaverHidden?.();
        this.unbindVisibility?.();
        // clear unsubscribe refs to avoid keeping closures alive
        this.unsubscribeWindow = undefined;
        this.unsubscribeElement = undefined;
        this.unsubScreensaverShown = undefined;
        this.unsubScreensaverHidden = undefined;
        this.unbindVisibility = undefined;

        this.intersectionObserver.disconnect();
        this.unbindImageInteractions();
        this.images.forEach(img => img.destroy());
        this.images.length = 0;
        this.imageLoader.destroy();

        // reset container dims
        this.containerWidth = 0;
        this.containerHeight = 0;

        this.log('info', `${this.constructor.name} destroyed`);
    }

    private bindImageInteraction(el: HTMLElement): void {
        const hoverEnabled = this.hoverBehavior !== 'none';
        const touchEnabled = this.tapToFreeze;
        if (!hoverEnabled && !touchEnabled) return;

        const onPointerEnter = () => {
            if (this.hoverBehavior === 'none') return;
            if (this.frozenElements.has(el)) return;
            if (this.hoverBehavior === 'stop') {
                this.imageSpeedOverrides.set(el, 0);
                return;
            }
            this.imageSpeedOverrides.set(el, this.hoverSlowMultiplier);
        };

        const onPointerLeave = () => {
            if (this.frozenElements.has(el)) return;
            this.imageSpeedOverrides.delete(el);
        };

        const onPointerUp = (event: PointerEvent) => {
            if (!this.tapToFreeze || event.pointerType !== 'touch') return;
            if (this.frozenElements.has(el)) {
                this.frozenElements.delete(el);
                this.imageSpeedOverrides.delete(el);
                return;
            }
            this.frozenElements.add(el);
            this.imageSpeedOverrides.set(el, 0);
        };

        el.addEventListener('pointerenter', onPointerEnter);
        el.addEventListener('pointerleave', onPointerLeave);
        el.addEventListener('pointerup', onPointerUp);

        this.interactionCleanups.push(() => {
            el.removeEventListener('pointerenter', onPointerEnter);
            el.removeEventListener('pointerleave', onPointerLeave);
            el.removeEventListener('pointerup', onPointerUp);
            this.imageSpeedOverrides.delete(el);
        });
    }

    private unbindImageInteractions(): void {
        this.interactionCleanups.forEach(unsub => unsub());
        this.interactionCleanups = [];
        this.frozenElements = new WeakSet<HTMLElement>();
        this.imageSpeedOverrides = new WeakMap<HTMLElement, number>();
    }

    protected abstract createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface;
    protected abstract handleImageResize(img: MotionImageInterface, dims: ContainerDimensionsInterface): void;
}

export class DriftImageEngine extends BaseImageEngine {
    protected readonly motionMode: ImageMotionMode = 'drift';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new DriftImage(el, dims, { debug: this.debug });
    }

    protected handleImageResize(img: MotionImageInterface, dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.clampPosition(dims);
        img.updatePosition();
    }
}

export class ParallaxDriftImageEngine extends BaseImageEngine {
    protected readonly motionMode: ImageMotionMode = 'parallax-drift';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new ParallaxDriftImage(el, dims, { debug: this.debug });
    }

    protected handleImageResize(img: MotionImageInterface, dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.clampPosition(dims);
        img.updatePosition();
    }
}

export class RainImageEngine extends BaseImageEngine {
    protected readonly motionMode: ImageMotionMode = 'rain';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new RainImage(el, dims);
    }

    protected handleImageResize(img: MotionImageInterface, _dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.updatePosition();
    }
}

export class BrownianImageEngine extends BaseImageEngine {
    protected readonly motionMode: ImageMotionMode = 'brownian';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new BrownianImage(el, dims);
    }

    protected handleImageResize(img: MotionImageInterface, dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.clampPosition(dims);
        img.updatePosition();
    }
}

export class WarpImageEngine extends BaseImageEngine {
    protected readonly motionMode: ImageMotionMode = 'warp';

    protected createImage(el: HTMLElement, dims: ContainerDimensionsInterface): MotionImageInterface {
        return new WarpImage(el, dims);
    }

    protected handleImageResize(img: MotionImageInterface, _dims: ContainerDimensionsInterface): void {
        img.updateSize();
        img.updatePosition();
    }
}
