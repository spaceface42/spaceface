// src/spaceface/system/features/ScrollDeck/ScrollDeck.ts

import { EventBinder } from '../../bin/EventBinder.js';
import { AsyncImageLoader } from '../bin/AsyncImageLoader.js';
import { resizeManager } from '../bin/ResizeManager.js';

interface ScrollDeckOptions {
  slideSelector?: string;
  trackSelector?: string;
  hudSelector?: string;
  hintSelector?: string;
  autoCreateHud?: boolean;
  includePicture?: boolean;
  debug?: boolean;
  topStripPx?: number;
  gate?: number;
  backZPx?: number;
  backScaleEnd?: number;
  scrollPerSegment?: number;
  hideHintAfter?: number;
}

export class ScrollDeck {
  static readonly DEFAULT_SLIDE_SELECTOR = '.slide';
  static readonly DEFAULT_TRACK_SELECTOR = '#track';
  static readonly DEFAULT_HUD_SELECTOR = '#hud';
  static readonly DEFAULT_HINT_SELECTOR = '#hint';
  static readonly DEFAULT_TOP_STRIP_PX = 100;
  static readonly DEFAULT_GATE = 0.12;
  static readonly DEFAULT_BACK_Z_PX = -220;
  static readonly DEFAULT_BACK_SCALE_END = 0.78;
  static readonly DEFAULT_SCROLL_PER_SEGMENT = 1.6;
  static readonly DEFAULT_HINT_HIDE_PROGRESS = 0.12;

  private readonly container: HTMLElement;
  private readonly binder: EventBinder;
  private readonly loader: AsyncImageLoader;
  private readonly debug: boolean;

  private readonly slideSelector: string;
  private readonly trackSelector: string;
  private readonly hudSelector: string;
  private readonly hintSelector: string;
  private readonly autoCreateHud: boolean;

  private readonly topStripPx: number;
  private readonly gate: number;
  private readonly backZPx: number;
  private readonly backScaleEnd: number;
  private readonly scrollPerSegment: number;
  private readonly hideHintAfter: number;

  private slides: HTMLElement[] = [];
  private dots: HTMLElement[] = [];
  private track: HTMLElement | null = null;
  private hint: HTMLElement | null = null;
  private hud: HTMLElement | null = null;

  private unsubscribeWindowResize?: () => void;
  private unsubscribeTrackResize?: () => void;

  private rafPending = false;
  private isDestroyed = false;

  public initError: unknown = null;
  public readonly ready: Promise<void>;

  constructor(containerOrSelector: string | HTMLElement, options: ScrollDeckOptions = {}) {
    this.container = this.resolveContainer(containerOrSelector);
    this.debug = !!options.debug;
    this.binder = new EventBinder(this.debug);
    this.loader = new AsyncImageLoader(this.container, {
      includePicture: options.includePicture ?? false,
      debug: this.debug,
    });

    this.slideSelector = options.slideSelector ?? ScrollDeck.DEFAULT_SLIDE_SELECTOR;
    this.trackSelector = options.trackSelector ?? ScrollDeck.DEFAULT_TRACK_SELECTOR;
    this.hudSelector = options.hudSelector ?? ScrollDeck.DEFAULT_HUD_SELECTOR;
    this.hintSelector = options.hintSelector ?? ScrollDeck.DEFAULT_HINT_SELECTOR;
    this.autoCreateHud = options.autoCreateHud ?? true;

    this.topStripPx = Math.max(0, options.topStripPx ?? ScrollDeck.DEFAULT_TOP_STRIP_PX);
    this.gate = this.clamp(options.gate ?? ScrollDeck.DEFAULT_GATE, 0.01, 0.99);
    this.backZPx = options.backZPx ?? ScrollDeck.DEFAULT_BACK_Z_PX;
    this.backScaleEnd = this.clamp(options.backScaleEnd ?? ScrollDeck.DEFAULT_BACK_SCALE_END, 0.01, 1);
    this.scrollPerSegment = Math.max(0.25, options.scrollPerSegment ?? ScrollDeck.DEFAULT_SCROLL_PER_SEGMENT);
    this.hideHintAfter = this.clamp(options.hideHintAfter ?? ScrollDeck.DEFAULT_HINT_HIDE_PROGRESS, 0, 1);

    this.ready = this.init()
      .catch((err) => {
        this.initError = err;
        this.log('error', 'ScrollDeck init failed', err);
      })
      .then(() => {});
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    if (!this.debug && level === 'debug') return;
    switch (level) {
      case 'debug':
        console.debug(`[ScrollDeck] [${level.toUpperCase()}] ${message}`, data);
        break;
      case 'info':
        console.info(`[ScrollDeck] [${level.toUpperCase()}] ${message}`, data);
        break;
      case 'warn':
        console.warn(`[ScrollDeck] [${level.toUpperCase()}] ${message}`, data);
        break;
      case 'error':
        console.error(`[ScrollDeck] [${level.toUpperCase()}] ${message}`, data);
        break;
    }
  }

  private resolveContainer(containerOrSelector: string | HTMLElement): HTMLElement {
    const container = typeof containerOrSelector === 'string'
      ? document.querySelector<HTMLElement>(containerOrSelector)
      : containerOrSelector;
    if (!container) throw new Error('ScrollDeck: container element not found.');
    return container;
  }

  private async init(): Promise<void> {
    await this.loader.waitForImagesToLoad();
    this.refreshElements();

    if (!this.slides.length) {
      this.log('warn', `No slides found with selector "${this.slideSelector}".`);
      return;
    }

    this.setupDots();
    this.setDeckHeight();
    this.bindEvents();
    this.render();
    this.log('info', 'ScrollDeck initialized', { slides: this.slides.length });
  }

  private refreshElements(): void {
    this.slides = Array.from(this.container.querySelectorAll<HTMLElement>(this.slideSelector));
    this.track = this.container.querySelector<HTMLElement>(this.trackSelector);
    this.hud = this.container.querySelector<HTMLElement>(this.hudSelector);
    this.hint = this.container.querySelector<HTMLElement>(this.hintSelector);

    if (!this.track) {
      this.track = this.container;
      this.log('warn', `Track not found with selector "${this.trackSelector}". Falling back to container.`);
    }
  }

  private setupDots(): void {
    if (!this.hud && this.autoCreateHud) {
      this.hud = document.createElement('div');
      const normalizedHudId = this.hudSelector.startsWith('#')
        ? this.hudSelector.slice(1)
        : 'hud';
      this.hud.id = normalizedHudId || 'hud';
      this.container.appendChild(this.hud);
    }

    if (!this.hud) return;

    this.hud.innerHTML = '';
    this.dots = this.slides.map(() => {
      const dot = document.createElement('div');
      dot.className = 'hud-dot';
      this.hud!.appendChild(dot);
      return dot;
    });
  }

  private bindEvents(): void {
    this.binder.bindDOM(window, 'scroll', () => this.requestRender(), { passive: true });

    this.unsubscribeWindowResize = resizeManager.onWindow(() => {
      this.setDeckHeight();
      this.requestRender();
    });

    if (this.track) {
      this.unsubscribeTrackResize = resizeManager.onElement(this.track, () => {
        this.requestRender();
      }, { debounceMs: 50 });
    }
  }

  private setDeckHeight(): void {
    const vh = window.innerHeight;
    this.container.style.height = `${(this.slides.length * this.scrollPerSegment + 1) * vh}px`;
  }

  private requestRender(): void {
    if (this.isDestroyed || this.rafPending) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      this.render();
    });
  }

  private clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
  }

  private norm(value: number, start: number, end: number): number {
    return this.clamp((value - start) / (end - start));
  }

  private easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private hideSlide(slide: HTMLElement): void {
    const h = this.track?.clientHeight || window.innerHeight;
    slide.style.visibility = 'hidden';
    slide.style.zIndex = '0';
    slide.style.transform = `translate3d(0, ${h}px, 0) scale(1)`;
  }

  private showSlide(slide: HTMLElement, ty: number, tz: number, scale: number, z: number): void {
    slide.style.visibility = 'visible';
    slide.style.zIndex = String(z);
    slide.style.transform = `translate3d(0, ${ty}px, ${tz}px) scale(${scale})`;
  }

  private getProgress(): number {
    const vh = window.innerHeight;
    const yInDeck = -this.container.getBoundingClientRect().top;
    const n = this.slides.length;
    return this.clamp(yInDeck / (this.scrollPerSegment * vh), 0, n);
  }

  private renderDots(segment: number, local: number): void {
    if (!this.dots.length) return;
    let activeDot = segment;
    if (segment > 0 && local < this.gate) activeDot = segment - 1;
    this.dots.forEach((dot, index) => dot.classList.toggle('active', index === activeDot));
  }

  private renderHint(progress: number): void {
    if (!this.hint) return;
    this.hint.style.opacity = progress < this.hideHintAfter ? '1' : '0';
  }

  private render(): void {
    if (this.isDestroyed || !this.slides.length) return;

    const n = this.slides.length;
    const progress = this.getProgress();
    const segment = Math.min(Math.floor(progress), n - 1);
    const local = this.clamp(progress - segment, 0, 1);

    const cardH = this.track?.clientHeight || window.innerHeight;
    const startY = Math.max(0, cardH - this.topStripPx);

    this.slides.forEach((slide) => this.hideSlide(slide));
    this.renderDots(segment, local);
    this.renderHint(progress);

    if (segment === 0) {
      const t = this.easeOutQuart(local);
      const ty = startY * (1 - t);
      this.showSlide(this.slides[0], ty, 0, 1, 10);
      return;
    }

    const prev = segment - 1;
    const curr = segment;
    const prevSlide = this.slides[prev];
    const currSlide = this.slides[curr];
    if (!prevSlide || !currSlide) return;

    if (local < this.gate) {
      const t = this.easeInOutCubic(this.norm(local, 0, this.gate));
      const tz = this.backZPx * t;
      const scale = 1 + (this.backScaleEnd - 1) * t;
      this.showSlide(prevSlide, 0, tz, scale, 5);
      return;
    }

    const t = this.easeOutQuart(this.norm(local, this.gate, 1));
    const prevScale = this.backScaleEnd - 0.04 * t;
    const currY = startY * (1 - t);

    this.showSlide(prevSlide, 0, this.backZPx, prevScale, 4);
    this.showSlide(currSlide, currY, 0, 1, 10);
  }

  public refresh(): void {
    if (this.isDestroyed) return;
    this.refreshElements();
    this.setupDots();
    this.setDeckHeight();
    this.requestRender();
  }

  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.unsubscribeWindowResize?.();
    this.unsubscribeTrackResize?.();
    this.binder.unbindAll();
    this.loader.destroy();
    this.slides = [];
    this.dots = [];
    this.track = null;
    this.hud = null;
    this.hint = null;
    this.log('info', 'ScrollDeck destroyed');
  }
}
