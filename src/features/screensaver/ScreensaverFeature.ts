import type { Feature, StartupContext } from "../../core/lifecycle.js";
import { FloatingImagesFeature } from "../floating-images/FloatingImagesFeature.js";
import { loadPartialHtml } from "../../core/partials.js";

export interface ScreensaverFeatureOptions {
  targetSelector?: string;
  idleMs: number;
  partialUrl?: string;
}

export class ScreensaverFeature implements Feature {
  readonly name = "screensaver";
  private static readonly FADE_OUT_CLEANUP_MS = 360;
  private static readonly MOUSEMOVE_THROTTLE_MS = 120;
  private static readonly DEFAULT_TARGET_ATTR = "data-screensaver";
  private static readonly DEFAULT_TARGET_SELECTOR = `[${ScreensaverFeature.DEFAULT_TARGET_ATTR}]`;

  private readonly options: ScreensaverFeatureOptions;
  private timer: number | null = null;
  private target: HTMLElement | null = null;
  private onActivityBound: () => void;
  private onMouseMoveBound: () => void;
  private events?: StartupContext["events"];
  private ctx?: StartupContext;
  private screensaverFloating?: FloatingImagesFeature;
  private partialLoadPromise?: Promise<void>;
  private partialLoaded = false;
  private hideCleanupTimer: number | null = null;
  private autoCreatedTarget = false;
  private lastMouseMoveAt = 0;

  constructor(options: ScreensaverFeatureOptions) {
    this.options = options;
    this.onActivityBound = this.onActivity.bind(this);
    this.onMouseMoveBound = this.onMouseMoveActivity.bind(this);
  }

  init(ctx: StartupContext): void {
    this.ctx = ctx;
    this.events = ctx.events;
    this.target = this.resolveOrCreateTarget();
    if (!this.target) {
      ctx.logger.debug("screensaver skipped: target not found");
      return;
    }
    this.target.hidden = false;
    this.target.classList.remove("is-active");
    this.target.setAttribute("aria-hidden", "true");

    document.addEventListener("mousemove", this.onMouseMoveBound, { passive: true });
    document.addEventListener("keydown", this.onActivityBound, { passive: true });
    document.addEventListener("pointerdown", this.onActivityBound, { passive: true });

    this.armTimer(ctx);
  }

  destroy(): void {
    document.removeEventListener("mousemove", this.onMouseMoveBound);
    document.removeEventListener("keydown", this.onActivityBound);
    document.removeEventListener("pointerdown", this.onActivityBound);
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.hideCleanupTimer !== null) {
      clearTimeout(this.hideCleanupTimer);
      this.hideCleanupTimer = null;
    }
    if (this.target) {
      this.target.classList.remove("is-active");
      this.target.setAttribute("aria-hidden", "true");
      if (this.autoCreatedTarget) {
        this.target.remove();
      } else {
        this.target.hidden = true;
      }
      this.target = null;
    }
    this.stopScreensaverFloating();
    this.ctx = undefined;
    this.events = undefined;
    this.lastMouseMoveAt = 0;
  }

  onRouteChange(_nextRoute: string, ctx: StartupContext): void {
    this.ctx = ctx;
    this.events = ctx.events;

    const previousTarget = this.target;
    const previousWasAutoCreated = this.autoCreatedTarget;
    const wasVisible = previousTarget?.classList.contains("is-active") ?? false;

    if (wasVisible) {
      this.events.emit("screensaver:hidden", { target: this.options.targetSelector ?? ScreensaverFeature.DEFAULT_TARGET_SELECTOR });
    }
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.hideCleanupTimer !== null) {
      clearTimeout(this.hideCleanupTimer);
      this.hideCleanupTimer = null;
    }
    this.stopScreensaverFloating();
    if (previousTarget) {
      previousTarget.classList.remove("is-active");
      previousTarget.setAttribute("aria-hidden", "true");
    }

    this.target = this.resolveOrCreateTarget();
    if (previousTarget && previousTarget !== this.target && previousWasAutoCreated && previousTarget.isConnected) {
      previousTarget.remove();
    }
    if (!this.target) return;

    this.target.hidden = false;
    this.target.classList.remove("is-active");
    this.target.setAttribute("aria-hidden", "true");

    if (previousTarget !== this.target) {
      this.partialLoaded = false;
      this.partialLoadPromise = undefined;
    }

    this.armTimer(ctx);
  }

  private onActivity(): void {
    if (!this.target) return;
    const wasVisible = this.target.classList.contains("is-active");
    this.target.classList.remove("is-active");
    this.target.setAttribute("aria-hidden", "true");
    this.scheduleFloatingStopAfterFade();
    if (wasVisible) {
      this.events?.emit("screensaver:hidden", { target: this.options.targetSelector ?? ScreensaverFeature.DEFAULT_TARGET_SELECTOR });
    }
    this.events?.emit("user:active", { at: Date.now() });
    this.armTimer();
  }

  private onMouseMoveActivity(): void {
    const now = Date.now();
    if (now - this.lastMouseMoveAt < ScreensaverFeature.MOUSEMOVE_THROTTLE_MS) return;
    this.lastMouseMoveAt = now;
    this.onActivity();
  }

  private armTimer(ctx?: StartupContext): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }

    const events = ctx?.events ?? this.events;

    this.timer = window.setTimeout(async () => {
      if (!this.target) return;
      await this.prepareScreensaverMarkup();
      if (!this.target) return;
      if (this.hideCleanupTimer !== null) {
        clearTimeout(this.hideCleanupTimer);
        this.hideCleanupTimer = null;
      }
      this.target.classList.add("is-active");
      this.target.setAttribute("aria-hidden", "false");
      this.startScreensaverFloating();
      events?.emit("user:inactive", { at: Date.now(), idleMs: this.options.idleMs });
      events?.emit("screensaver:shown", { target: this.options.targetSelector ?? ScreensaverFeature.DEFAULT_TARGET_SELECTOR });
    }, this.options.idleMs);
  }

  private async prepareScreensaverMarkup(): Promise<void> {
    if (!this.target) return;
    if (!this.options.partialUrl) return;
    if (this.partialLoaded) return;
    if (this.partialLoadPromise) {
      await this.partialLoadPromise;
      return;
    }

    const logger = this.ctx?.logger;
    const partialBaseUrl = new URL(this.options.partialUrl ?? "", window.location.href);
    this.partialLoadPromise = (async () => {
      try {
        const html = await loadPartialHtml(this.options.partialUrl ?? "", { cache: true });
        if (!this.target) return;
        const mount = this.getOrCreatePartialMount(this.target);
        mount.innerHTML = html;
        this.normalizePartialAssetUrls(mount, partialBaseUrl);
        this.normalizeScreensaverMarkup(mount);
        this.partialLoaded = true;
        logger?.info("screensaver partial loaded", { partialUrl: this.options.partialUrl });
      } catch (error) {
        logger?.warn("screensaver partial load failed; using fallback markup", {
          partialUrl: this.options.partialUrl,
          error,
        });
      } finally {
        this.partialLoadPromise = undefined;
      }
    })();

    await this.partialLoadPromise;
  }

  private startScreensaverFloating(): void {
    if (!this.target || !this.ctx) return;
    const floatingRoot = this.ensureFloatingRoot(this.target);
    if (!floatingRoot) return;
    floatingRoot.style.opacity = "0";

    if (this.screensaverFloating) {
      this.screensaverFloating.destroy();
      this.screensaverFloating = undefined;
    }

    this.screensaverFloating = new FloatingImagesFeature({
      containerSelector: `[data-screensaver] [data-screensaver-floating]`,
      itemSelector: `[data-screensaver] [data-screensaver-floating-item]`,
      baseSpeed: 30,
      pauseOnScreensaver: false,
      hoverBehavior: "none",
    });
    this.screensaverFloating
      .init(this.ctx)
      .catch(() => {
        // Keep screensaver visible even if floating init fails.
      })
      .finally(() => {
        // Reveal after first placement pass to avoid one-frame flash at origin/layout positions.
        if (this.target && this.target.contains(floatingRoot)) {
          floatingRoot.style.opacity = "1";
        }
      });
  }

  private stopScreensaverFloating(): void {
    this.screensaverFloating?.destroy();
    this.screensaverFloating = undefined;
    if (this.target) {
      const floatingRoot = this.target.querySelector<HTMLElement>("[data-screensaver-floating], [data-floating-images]");
      if (floatingRoot) floatingRoot.style.opacity = "";
    }
  }

  private scheduleFloatingStopAfterFade(): void {
    if (this.hideCleanupTimer !== null) {
      clearTimeout(this.hideCleanupTimer);
    }
    this.hideCleanupTimer = window.setTimeout(() => {
      this.stopScreensaverFloating();
      this.hideCleanupTimer = null;
    }, ScreensaverFeature.FADE_OUT_CLEANUP_MS);
  }

  private ensureFloatingRoot(target: HTMLElement): HTMLElement | null {
    let floatingRoot = target.querySelector<HTMLElement>("[data-screensaver-floating], [data-floating-images]");
    if (floatingRoot) return floatingRoot;

    floatingRoot = document.createElement("div");
    floatingRoot.setAttribute("data-screensaver-floating", "true");

    const labels = ["*", "+", "o", "x", "~", "@", "#", "[]"];
    for (let i = 0; i < 10; i += 1) {
      const item = document.createElement("div");
      item.setAttribute("data-screensaver-floating-item", "true");
      item.textContent = labels[i % labels.length];
      floatingRoot.appendChild(item);
    }

    target.appendChild(floatingRoot);
    return floatingRoot;
  }

  private getOrCreatePartialMount(target: HTMLElement): HTMLElement {
    let mount = target.querySelector<HTMLElement>("[data-screensaver-partial]");
    if (mount) return mount;
    mount = document.createElement("div");
    mount.setAttribute("data-screensaver-partial", "true");
    target.prepend(mount);
    return mount;
  }

  private normalizeScreensaverMarkup(root: HTMLElement): void {
    const floatingRoot = root.querySelector<HTMLElement>("[data-screensaver-floating], [data-floating-images]");
    if (!floatingRoot) return;
    floatingRoot.setAttribute("data-screensaver-floating", "true");
    // Prevent page-level floating container styles (fixed card height/border/background)
    // from constraining screensaver layout.
    floatingRoot.classList.remove("floating-images-container");

    const nodes = floatingRoot.querySelectorAll<HTMLElement>("[data-screensaver-floating-item], [data-floating-item], .floating-image");
    nodes.forEach((node) => {
      node.setAttribute("data-screensaver-floating-item", "true");
    });
  }

  private normalizePartialAssetUrls(root: HTMLElement, baseUrl: URL): void {
    const images = root.querySelectorAll<HTMLImageElement>("img[src]");
    images.forEach((image) => {
      const src = image.getAttribute("src");
      if (!src) return;
      if (/^(?:[a-z]+:|\/\/|#|data:)/i.test(src)) return;
      image.src = new URL(src, baseUrl).toString();
    });
  }

  private resolveOrCreateTarget(): HTMLElement | null {
    const selector = this.options.targetSelector;
    if (selector) {
      const existing = document.querySelector<HTMLElement>(selector);
      if (existing) {
        this.autoCreatedTarget = false;
        return existing;
      }
      return null;
    }

    const byAttr = document.querySelector<HTMLElement>(ScreensaverFeature.DEFAULT_TARGET_SELECTOR);
    if (byAttr) {
      this.autoCreatedTarget = false;
      return byAttr;
    }

    const el = document.createElement("div");
    el.setAttribute(ScreensaverFeature.DEFAULT_TARGET_ATTR, "true");
    el.hidden = true;
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    this.autoCreatedTarget = true;
    return el;
  }
}
