// src/spaceface/features/SlidePlayer/SlidePlayer.ts


import { eventBus } from '../../bin/EventBus.js';
import { EventBinder } from '../../bin/EventBinder.js';
import { AsyncImageLoader } from '../bin/AsyncImageLoader.js';
import { animationLoop } from '../bin/AnimationLoop.js';
import { AnimationPolicy, AnimationPauseReason } from '../bin/AnimationPolicy.js';
import type { LogPayload } from '../../types/bin.js';
import { EVENTS } from '../../types/events.js';

interface ISlidePlayerOptions {
  interval?: number;
  includePicture?: boolean;
  dotsSelector?: string;
  autoCreateDots?: boolean;
  startPaused?: boolean;
  enableBusEvents?: boolean;
  autoplay?: boolean;
  debug?: boolean;
}

export class SlidePlayer {
  static readonly SWIPE_THRESHOLD = 50;
  static readonly VERTICAL_TOLERANCE = 30;
  static readonly DEFAULT_INTERVAL = 5000;

  private container: HTMLElement;
  private interval: number;
  private includePicture: boolean;
  private dotsSelector: string;
  private autoCreateDots: boolean;
  private enableBusEvents: boolean;
  private autoplay: boolean;
  private debug: boolean;

  private slides: HTMLElement[] = [];
  private dots: HTMLDivElement[] = [];
  private dotsWrapper: HTMLElement | null = null;
  private currentIndex = 0;

  private lastTickTime = 0;
  private isDestroyed = false;

  private isPointerDown = false;
  private pointerStartX = 0;
  private pointerStartY = 0;
  private pointerEndX = 0;
  private pointerEndY = 0;

  private animationPolicy = new AnimationPolicy();
  private loader: AsyncImageLoader;
  private binder: EventBinder;
  private animateCallback: () => void;

  private lastPauseState: boolean = false;
  public readonly ready: Promise<void>;
  public initError: unknown = null;

  constructor(
    containerOrSelector: string | HTMLElement,
    {
      interval = SlidePlayer.DEFAULT_INTERVAL,
      includePicture = false,
      dotsSelector = '.dots',
      autoCreateDots = false,
      startPaused = false,
      enableBusEvents = true,
      autoplay = true,
      debug = false
    }: ISlidePlayerOptions = {}
  ) {
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

    if (startPaused) this.animationPolicy.set('manual', true);

    this.animateCallback = () => this.animate();
    // Ensure init always resolves to avoid unhandled rejection.
    // If init fails we capture the error in initError for callers to inspect.
    this.ready = this.init()
      .catch((err) => {
        this.initError = err;
        this.log('error', 'SlidePlayer init failed', err);
      })
      .then(() => {});

    this.log('info', 'SlidePlayer initialized', { container: this.container, interval, autoplay, debug });
  }

  /** ---- Centralized logging ---- */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown) {
    if (!this.debug && level === 'debug') return;

    const payload: LogPayload = { scope: 'SlidePlayer', level, message, data, time: Date.now() };
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

  private resolveContainer(containerOrSelector: string | HTMLElement): HTMLElement {
    const container = typeof containerOrSelector === 'string'
      ? document.querySelector<HTMLElement>(containerOrSelector)
      : containerOrSelector;
    if (!container) throw new Error('SlidePlayer: container element not found.');
    return container;
  }

  /** ---- Initialization ---- */
  private async init(): Promise<void> {
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

    // bus bindings handled by bindActivityEvents() to avoid duplication

    if (!this.isPaused() && this.autoplay) {
      animationLoop.add(this.animateCallback);
    }
  }

  /** ---- RAF Animation ---- */
  private animate(): void {
    if (this.isDestroyed || !this.autoplay || this.isPaused() || this.slides.length < 2) return;

    const now = performance.now();
    const elapsed = now - this.lastTickTime;

    if (elapsed >= this.interval) {
      this.next(false);
      this.lastTickTime = now;
    }
  }

  /** ---- Pause / Resume ---- */
  private togglePause(reason: AnimationPauseReason, shouldPause: boolean): void {
    this.animationPolicy.set(reason, shouldPause);

    this.emitPauseResumeIfChanged();

    if (this.isPaused()) {
      if (animationLoop.has(this.animateCallback)) animationLoop.remove(this.animateCallback);
      this.log('debug', `Paused due to: ${this.animationPolicy.list().join(', ')}`);
    } else {
      if (!animationLoop.has(this.animateCallback)) animationLoop.add(this.animateCallback);
      this.log('debug', 'Resumed playback');
    }
  }

  private emitPauseResumeIfChanged(): void {
      const nowPaused = this.isPaused();
    if (nowPaused !== this.lastPauseState) {
      this.lastPauseState = nowPaused;
      const event = nowPaused ? 'slideplayer:paused' : 'slideplayer:resumed';
      this.emit(event, { reasons: this.animationPolicy.list() });
    }
  }

  public play(): void { this.togglePause('manual', false); }
  public pause(): void { this.togglePause('manual', true); }
  public isPaused(): boolean { return this.animationPolicy.isPaused(); }

  /** ---- Slide Navigation ---- */
  public goToSlide(index: number, restart: boolean = true): void {
    if (index < 0 || index >= this.slides.length || index === this.currentIndex) return;
    this.setActiveSlide(index);
    if (restart) this.resetTimer();
  }

  public next(restart: boolean = true): void {
    if (this.slides.length < 2) return;
    this.goToSlide((this.currentIndex + 1) % this.slides.length, restart);
  }

  public prev(restart: boolean = true): void {
    if (this.slides.length < 2) return;
    const prevIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
    this.goToSlide(prevIndex, restart);
  }

  /** ---- Slides / Dots ---- */
  private refreshSlides(): void {
    this.slides = Array.from(this.container.querySelectorAll<HTMLElement>('.slide'));
  }

  private setupDots(): void {
    this.dotsWrapper = this.container.querySelector(this.dotsSelector);
    if (!this.dotsWrapper && this.autoCreateDots) {
      this.dotsWrapper = document.createElement('div');
      this.dotsWrapper.className = 'dots';
      this.container.appendChild(this.dotsWrapper);
    }
    if (!this.dotsWrapper) return;

    this.dotsWrapper.innerHTML = '';
    this.dots = this.slides.map((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.dataset.index = i.toString();
      this.binder.bindDOM(dot, 'click', () => this.goToSlide(i));
      this.dotsWrapper!.appendChild(dot);
      return dot;
    });
  }

  private updateDots(index: number): void {
    this.dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  private setActiveSlide(index: number): void {
    const prev = this.currentIndex;
    this.slides[this.currentIndex]?.classList.remove('active');
    this.currentIndex = index;
    this.slides[this.currentIndex]?.classList.add('active');
    this.updateDots(index);

    if (prev !== index) this.emit('slideplayer:slideChanged', { index }, 'slideplayer:slide-changed');
  }

  private resetTimer(): void { this.lastTickTime = performance.now(); }

  /** ---- Event Binding ---- */
  private bindEvents(): void {
    this.bindPointerEvents();
    this.bindKeyboardEvents();
    this.bindVisibilityEvents();
    this.bindActivityEvents();
    this.bindUnloadEvent();
  }

  private bindPointerEvents(): void {
    this.binder.bindDOM(this.container, 'pointerdown', (e) => {
      const ev = e as PointerEvent;
      this.isPointerDown = true;
      this.pointerStartX = ev.clientX; this.pointerStartY = ev.clientY;
      this.pointerEndX = ev.clientX; this.pointerEndY = ev.clientY;
    });
    this.binder.bindDOM(this.container, 'pointermove', (e) => {
      if (!this.isPointerDown) return;
      const ev = e as PointerEvent;
      this.pointerEndX = ev.clientX; this.pointerEndY = ev.clientY;
    });
    // listen for pointerup/pointercancel on window so release outside container is handled
    this.binder.bindDOM(window, 'pointerup', () => {
      if (this.isPointerDown) { this.handleSwipe(); this.isPointerDown = false; }
    });
    this.binder.bindDOM(window, 'pointercancel', () => {
      this.isPointerDown = false;
    });
    this.binder.bindDOM(this.container, 'pointerleave', () => this.isPointerDown = false);
    this.binder.bindDOM(this.container, 'mouseenter', () => this.togglePause('hover', true));
    this.binder.bindDOM(this.container, 'mouseleave', () => this.togglePause('hover', false));
  }

  private bindKeyboardEvents(): void {
    this.binder.bindDOM(document, 'keydown', (e) => {
      const ev = e as KeyboardEvent;
      if (ev.key === 'ArrowRight') this.next();
      else if (ev.key === 'ArrowLeft') this.prev();
    });
  }

  private bindVisibilityEvents(): void {
    this.binder.bindDOM(document, 'visibilitychange', () => {
      this.togglePause('hidden', document.visibilityState === 'hidden');
    });
  }

  private bindActivityEvents(): void {
    if (this.enableBusEvents) {
      this.binder.bindBus(EVENTS.USER_INACTIVE, () => this.togglePause('inactivity', true));
      this.binder.bindBus(EVENTS.USER_ACTIVE, () => this.togglePause('inactivity', false));
      this.binder.bindBus(EVENTS.SCREENSAVER_SHOWN, () => this.togglePause('screensaver', true));
      this.binder.bindBus(EVENTS.SCREENSAVER_HIDDEN, () => this.togglePause('screensaver', false));
    }
  }

  private bindUnloadEvent(): void {
    this.binder.bindDOM(window, 'beforeunload', () => this.destroy());
  }

  private handleSwipe(): void {
    const dx = this.pointerEndX - this.pointerStartX;
    const dy = this.pointerEndY - this.pointerStartY;
    if (Math.abs(dx) >= SlidePlayer.SWIPE_THRESHOLD && Math.abs(dy) < SlidePlayer.VERTICAL_TOLERANCE) {
      const direction = dx < 0 ? 'next' : 'prev';
      this.log('debug', `Swipe detected`, { dx, dy, direction });
      if (dx < 0) this.next();
      else this.prev();
    }
  }

  private emit(type: string, detail: unknown, busEvent?: string): void {
    this.container.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
    if (this.enableBusEvents && busEvent) eventBus.emit(busEvent, detail);
  }

  public destroy(): void {
    if (this.isDestroyed) return;
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

  /** ---- Public getters ---- */
  public get currentSlideIndex(): number { return this.currentIndex; }
  public get slideCount(): number { return this.slides.length; }
}
