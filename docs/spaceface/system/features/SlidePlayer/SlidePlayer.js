export const VERSION = '2.0.0';
import { eventBus } from '../../bin/EventBus.js';
import { EventBinder } from '../../bin/EventBinder.js';
import { AsyncImageLoader } from '../bin/AsyncImageLoader.js';
import { animationLoop } from '../bin/AnimationLoop.js';
import { AnimationPolicy } from '../bin/AnimationPolicy.js';
import { EVENTS } from '../../types/events.js';
export class SlidePlayer {
    static SWIPE_THRESHOLD = 50;
    static VERTICAL_TOLERANCE = 30;
    static DEFAULT_INTERVAL = 5000;
    container;
    interval;
    includePicture;
    dotsSelector;
    autoCreateDots;
    enableBusEvents;
    autoplay;
    debug;
    slides = [];
    dots = [];
    dotsWrapper = null;
    currentIndex = 0;
    lastTickTime = 0;
    isDestroyed = false;
    isPointerDown = false;
    pointerStartX = 0;
    pointerStartY = 0;
    pointerEndX = 0;
    pointerEndY = 0;
    animationPolicy = new AnimationPolicy();
    loader;
    binder;
    animateCallback;
    lastPauseState = false;
    ready;
    initError = null;
    constructor(containerOrSelector, { interval = SlidePlayer.DEFAULT_INTERVAL, includePicture = false, dotsSelector = '.dots', autoCreateDots = false, startPaused = false, enableBusEvents = true, autoplay = true, debug = false } = {}) {
        this.container = this.resolveContainer(containerOrSelector);
        this.interval = interval > 0 ? interval : SlidePlayer.DEFAULT_INTERVAL;
        this.includePicture = includePicture;
        this.dotsSelector = dotsSelector;
        this.autoCreateDots = autoCreateDots;
        this.enableBusEvents = enableBusEvents;
        this.autoplay = autoplay;
        this.debug = debug;
        this.loader = new AsyncImageLoader(this.container, { includePicture });
        this.binder = new EventBinder(this.debug);
        if (startPaused)
            this.animationPolicy.set('manual', true);
        this.animateCallback = () => this.animate();
        this.ready = this.init()
            .catch((err) => {
            this.initError = err;
            this.log('error', 'SlidePlayer init failed', err);
        })
            .then(() => { });
        this.log('info', 'SlidePlayer initialized', { container: this.container, interval, autoplay, debug });
    }
    log(level, message, data) {
        if (!this.debug && level === 'debug')
            return;
        const payload = { scope: 'SlidePlayer', level, message, data, time: Date.now() };
        eventBus.emit(EVENTS.SLIDEPLAYER_LOG, { level, message, data });
        eventBus.emit(EVENTS.LOG, payload);
        if (this.debug) {
            switch (level) {
                case 'debug':
                    console.debug(`[SlidePlayer] [${level.toUpperCase()}]`, message, data);
                    break;
                case 'info':
                    console.info(`[SlidePlayer] [${level.toUpperCase()}]`, message, data);
                    break;
                case 'warn':
                    console.warn(`[SlidePlayer] [${level.toUpperCase()}]`, message, data);
                    break;
                case 'error':
                    console.error(`[SlidePlayer] [${level.toUpperCase()}]`, message, data);
                    break;
            }
        }
    }
    resolveContainer(containerOrSelector) {
        const container = typeof containerOrSelector === 'string'
            ? document.querySelector(containerOrSelector)
            : containerOrSelector;
        if (!container)
            throw new Error('SlidePlayer: container element not found.');
        return container;
    }
    async init() {
        await this.loader.waitForImagesToLoad();
        this.refreshSlides();
        if (!this.slides.length) {
            this.log('warn', 'No .slide elements found in container.');
            return;
        }
        this.setupDots();
        this.bindEvents();
        this.setActiveSlide(0);
        this.lastTickTime = performance.now();
        if (!this.isPaused() && this.autoplay) {
            animationLoop.add(this.animateCallback);
        }
    }
    animate() {
        if (this.isDestroyed || !this.autoplay || this.isPaused() || this.slides.length < 2)
            return;
        const now = performance.now();
        const elapsed = now - this.lastTickTime;
        if (elapsed >= this.interval) {
            this.next(false);
            this.lastTickTime = now;
        }
    }
    togglePause(reason, shouldPause) {
        this.animationPolicy.set(reason, shouldPause);
        this.emitPauseResumeIfChanged();
        if (this.isPaused()) {
            if (animationLoop.has(this.animateCallback))
                animationLoop.remove(this.animateCallback);
            this.log('debug', `Paused due to: ${this.animationPolicy.list().join(', ')}`);
        }
        else {
            if (!animationLoop.has(this.animateCallback))
                animationLoop.add(this.animateCallback);
            this.log('debug', 'Resumed playback');
        }
    }
    emitPauseResumeIfChanged() {
        const nowPaused = this.isPaused();
        if (nowPaused !== this.lastPauseState) {
            this.lastPauseState = nowPaused;
            const event = nowPaused ? 'slideplayer:paused' : 'slideplayer:resumed';
            this.emit(event, { reasons: this.animationPolicy.list() });
        }
    }
    play() { this.togglePause('manual', false); }
    pause() { this.togglePause('manual', true); }
    isPaused() { return this.animationPolicy.isPaused(); }
    goToSlide(index, restart = true) {
        if (index < 0 || index >= this.slides.length || index === this.currentIndex)
            return;
        this.setActiveSlide(index);
        if (restart)
            this.resetTimer();
    }
    next(restart = true) {
        if (this.slides.length < 2)
            return;
        this.goToSlide((this.currentIndex + 1) % this.slides.length, restart);
    }
    prev(restart = true) {
        if (this.slides.length < 2)
            return;
        const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
        this.goToSlide(prevIndex, restart);
    }
    refreshSlides() {
        this.slides = Array.from(this.container.querySelectorAll('.slide'));
    }
    setupDots() {
        this.dotsWrapper = this.container.querySelector(this.dotsSelector);
        if (!this.dotsWrapper && this.autoCreateDots) {
            this.dotsWrapper = document.createElement('div');
            this.dotsWrapper.className = 'dots';
            this.container.appendChild(this.dotsWrapper);
        }
        if (!this.dotsWrapper)
            return;
        this.dotsWrapper.innerHTML = '';
        this.dots = this.slides.map((_, i) => {
            const dot = document.createElement('div');
            dot.className = 'dot';
            dot.dataset.index = i.toString();
            this.binder.bindDOM(dot, 'click', () => this.goToSlide(i));
            this.dotsWrapper.appendChild(dot);
            return dot;
        });
    }
    updateDots(index) {
        this.dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
    }
    setActiveSlide(index) {
        const prev = this.currentIndex;
        this.slides[this.currentIndex]?.classList.remove('active');
        this.currentIndex = index;
        this.slides[this.currentIndex]?.classList.add('active');
        this.updateDots(index);
        if (prev !== index)
            this.emit('slideplayer:slideChanged', { index }, 'slideplayer:slide-changed');
    }
    resetTimer() { this.lastTickTime = performance.now(); }
    bindEvents() {
        this.bindPointerEvents();
        this.bindKeyboardEvents();
        this.bindVisibilityEvents();
        this.bindActivityEvents();
        this.bindUnloadEvent();
    }
    bindPointerEvents() {
        this.binder.bindDOM(this.container, 'pointerdown', (e) => {
            const ev = e;
            this.isPointerDown = true;
            this.pointerStartX = ev.clientX;
            this.pointerStartY = ev.clientY;
            this.pointerEndX = ev.clientX;
            this.pointerEndY = ev.clientY;
        });
        this.binder.bindDOM(this.container, 'pointermove', (e) => {
            if (!this.isPointerDown)
                return;
            const ev = e;
            this.pointerEndX = ev.clientX;
            this.pointerEndY = ev.clientY;
        });
        this.binder.bindDOM(window, 'pointerup', () => {
            if (this.isPointerDown) {
                this.handleSwipe();
                this.isPointerDown = false;
            }
        });
        this.binder.bindDOM(window, 'pointercancel', () => {
            this.isPointerDown = false;
        });
        this.binder.bindDOM(this.container, 'pointerleave', () => this.isPointerDown = false);
        this.binder.bindDOM(this.container, 'mouseenter', () => this.togglePause('hover', true));
        this.binder.bindDOM(this.container, 'mouseleave', () => this.togglePause('hover', false));
    }
    bindKeyboardEvents() {
        this.binder.bindDOM(document, 'keydown', (e) => {
            const ev = e;
            if (ev.key === 'ArrowRight')
                this.next();
            else if (ev.key === 'ArrowLeft')
                this.prev();
        });
    }
    bindVisibilityEvents() {
        this.binder.bindDOM(document, 'visibilitychange', () => {
            this.togglePause('hidden', document.visibilityState === 'hidden');
        });
    }
    bindActivityEvents() {
        if (this.enableBusEvents) {
            this.binder.bindBus(EVENTS.USER_INACTIVE, () => this.togglePause('inactivity', true));
            this.binder.bindBus(EVENTS.USER_ACTIVE, () => this.togglePause('inactivity', false));
            this.binder.bindBus(EVENTS.SCREENSAVER_SHOWN, () => this.togglePause('screensaver', true));
            this.binder.bindBus(EVENTS.SCREENSAVER_HIDDEN, () => this.togglePause('screensaver', false));
        }
    }
    bindUnloadEvent() {
        this.binder.bindDOM(window, 'beforeunload', () => this.destroy());
    }
    handleSwipe() {
        const dx = this.pointerEndX - this.pointerStartX;
        const dy = this.pointerEndY - this.pointerStartY;
        if (Math.abs(dx) >= SlidePlayer.SWIPE_THRESHOLD && Math.abs(dy) < SlidePlayer.VERTICAL_TOLERANCE) {
            const direction = dx < 0 ? 'next' : 'prev';
            this.log('debug', `Swipe detected`, { dx, dy, direction });
            if (dx < 0)
                this.next();
            else
                this.prev();
        }
    }
    emit(type, detail, busEvent) {
        this.container.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
        if (this.enableBusEvents && busEvent)
            eventBus.emit(busEvent, detail);
    }
    destroy() {
        if (this.isDestroyed)
            return;
        this.isDestroyed = true;
        animationLoop.remove(this.animateCallback);
        this.binder.unbindAll();
        this.loader.destroy();
        this.slides = [];
        this.dots = [];
        this.dotsWrapper = null;
        this.animationPolicy.clear();
        this.log('info', 'SlidePlayer destroyed');
    }
    get currentSlideIndex() { return this.currentIndex; }
    get slideCount() { return this.slides.length; }
}
//# sourceMappingURL=SlidePlayer.js.map