export const VERSION = '2.1.0';
import { FloatingImage } from './FloatingImage.js';
import { PerformanceMonitor } from '../bin/PerformanceMonitor.js';
import { resizeManager } from '../bin/ResizeManager.js';
import { AsyncImageLoader } from '../bin/AsyncImageLoader.js';
import { animationLoop } from '../bin/AnimationLoop.js';
import { eventBus } from '../../bin/EventBus.js';
import { debounce } from '../bin/timing.js';
export class FloatingImagesManager {
    container;
    performanceMonitor;
    images = [];
    speedMultiplier = 1;
    isInViewport = true;
    _destroyed = false;
    animateCallback;
    maxImages;
    intersectionObserver;
    unsubscribeWindow;
    unsubscribeElement;
    imageLoader;
    containerWidth;
    containerHeight;
    debug;
    hoverBehavior;
    hoverSlowMultiplier;
    tapToFreeze;
    pauseOnScreensaver;
    interactionCleanups = [];
    frozenElements = new WeakSet();
    imageSpeedOverrides = new WeakMap();
    unsubScreensaverShown;
    unsubScreensaverHidden;
    pausedByScreensaver = false;
    speedBeforeScreensaver = 1;
    constructor(container, options = {}) {
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
            if (!entry)
                return;
            this.isInViewport = !!entry.isIntersecting;
        }, { threshold: 0 });
        this.intersectionObserver.observe(this.container);
        this.setupResizeHandling();
        this.setupScreensaverHandling();
        this.imageLoader = new AsyncImageLoader(this.container);
        this.updateContainerDimensions();
        this.animateCallback = () => this.animate();
        if (!animationLoop.has(this.animateCallback)) {
            animationLoop.add(this.animateCallback);
        }
        this.initializeImages();
        this.log('info', 'FloatingImagesManager initialized', {
            container: this.container,
            maxImages: this.maxImages
        });
    }
    log(level, message, data) {
        if (!this.debug && level === 'debug')
            return;
        const payload = { scope: 'FloatingImagesManager', level, message, data, time: Date.now() };
        eventBus.emit('floatingImages:log', { level, message, data });
        eventBus.emit('log', payload);
        if (this.debug) {
            const consoleMethodMap = {
                debug: 'debug',
                info: 'info',
                warn: 'warn',
                error: 'error',
            };
            const method = consoleMethodMap[level] ?? 'log';
            console[method](`[FloatingImagesManager] [${level.toUpperCase()}]`, message, data);
        }
    }
    setupResizeHandling() {
        this.unsubscribeWindow = resizeManager.onWindow(() => this.handleResize());
        this.unsubscribeElement = resizeManager.onElement(this.container, () => this.handleResize());
    }
    setupScreensaverHandling() {
        if (!this.pauseOnScreensaver)
            return;
        this.unsubScreensaverShown = eventBus.on('screensaver:shown', () => {
            if (this.pausedByScreensaver)
                return;
            this.speedBeforeScreensaver = this.speedMultiplier;
            this.speedMultiplier = 0;
            this.pausedByScreensaver = true;
            this.log('debug', 'Paused due to screensaver');
        });
        this.unsubScreensaverHidden = eventBus.on('screensaver:hidden', () => {
            if (!this.pausedByScreensaver)
                return;
            this.speedMultiplier = this.speedBeforeScreensaver;
            this.pausedByScreensaver = false;
            this.log('debug', 'Resumed after screensaver');
        });
    }
    updateContainerDimensions() {
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
    async initializeImages() {
        try {
            const imgElements = await this.imageLoader.waitForImagesToLoad('.floating-image');
            const dims = { width: this.containerWidth, height: this.containerHeight };
            imgElements.slice(0, this.maxImages).forEach(el => {
                if (this._destroyed)
                    return;
                this.addExistingImage(el, dims);
            });
            this.log('info', 'Images initialized', { count: this.images.length });
        }
        catch (err) {
            this.log('error', 'Failed to initialize images', err);
        }
    }
    addExistingImage(el, dims) {
        if (this.images.length >= this.maxImages)
            return;
        const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
        this.images.push(floatingImage);
        this.bindImageInteraction(el);
    }
    handleResize = debounce(() => {
        try {
            if (this._destroyed)
                return;
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
        }
        catch (error) {
            this.log('error', 'Error during handleResize', error);
        }
    }, 200);
    animate() {
        if (this._destroyed)
            return;
        if (!this.isInViewport || this.speedMultiplier === 0)
            return;
        const skipFrame = this.performanceMonitor.update();
        if (skipFrame)
            return;
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
    resetAllImagePositions() {
        const dims = { width: this.containerWidth, height: this.containerHeight };
        this.images.forEach(img => img.resetPosition(dims));
        this.log('debug', 'All image positions reset', dims);
    }
    reinitializeImages() {
        try {
            if (this._destroyed)
                return;
            if (!this.container.isConnected) {
                this.log('warn', 'reinitializeImages: container not in DOM, skipping');
                return;
            }
            this.images.forEach(img => img.destroy());
            this.images.length = 0;
            this.unbindImageInteractions();
            const dims = { width: this.containerWidth, height: this.containerHeight };
            const imgElements = Array.from(this.container.querySelectorAll('.floating-image'))
                .slice(0, this.maxImages);
            imgElements.forEach(el => {
                const floatingImage = new FloatingImage(el, dims, { debug: this.debug });
                this.images.push(floatingImage);
                this.bindImageInteraction(el);
            });
            this.log('info', 'Images reinitialized', { count: this.images.length });
        }
        catch (error) {
            this.log('error', 'Error during reinitializeImages', error);
        }
    }
    destroy() {
        if (this._destroyed)
            return;
        this._destroyed = true;
        if (animationLoop.has(this.animateCallback)) {
            animationLoop.remove(this.animateCallback);
        }
        this.unsubscribeWindow?.();
        this.unsubscribeElement?.();
        this.unsubScreensaverShown?.();
        this.unsubScreensaverHidden?.();
        this.unsubscribeWindow = undefined;
        this.unsubscribeElement = undefined;
        this.unsubScreensaverShown = undefined;
        this.unsubScreensaverHidden = undefined;
        this.intersectionObserver.disconnect();
        this.unbindImageInteractions();
        this.images.forEach(img => img.destroy());
        this.images.length = 0;
        this.imageLoader.destroy();
        this.containerWidth = 0;
        this.containerHeight = 0;
        this.log('info', 'FloatingImagesManager destroyed');
    }
    bindImageInteraction(el) {
        const hoverEnabled = this.hoverBehavior !== 'none';
        const touchEnabled = this.tapToFreeze;
        if (!hoverEnabled && !touchEnabled)
            return;
        const onPointerEnter = () => {
            if (this.hoverBehavior === 'none')
                return;
            if (this.frozenElements.has(el))
                return;
            if (this.hoverBehavior === 'stop') {
                this.imageSpeedOverrides.set(el, 0);
                return;
            }
            this.imageSpeedOverrides.set(el, this.hoverSlowMultiplier);
        };
        const onPointerLeave = () => {
            if (this.frozenElements.has(el))
                return;
            this.imageSpeedOverrides.delete(el);
        };
        const onPointerUp = (event) => {
            if (!this.tapToFreeze || event.pointerType !== 'touch')
                return;
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
    unbindImageInteractions() {
        this.interactionCleanups.forEach(unsub => unsub());
        this.interactionCleanups = [];
        this.frozenElements = new WeakSet();
        this.imageSpeedOverrides = new WeakMap();
    }
}
//# sourceMappingURL=FloatingImagesManager.js.map