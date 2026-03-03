import type { Feature, StartupContext } from "../../core/lifecycle.js";

export interface ScreensaverFeatureOptions {
  targetSelector: string;
  idleMs: number;
}

export class ScreensaverFeature implements Feature {
  readonly name = "screensaver";

  private readonly options: ScreensaverFeatureOptions;
  private timer: number | null = null;
  private target: HTMLElement | null = null;
  private onActivityBound: () => void;
  private events?: StartupContext["events"];

  constructor(options: ScreensaverFeatureOptions) {
    this.options = options;
    this.onActivityBound = this.onActivity.bind(this);
  }

  init(ctx: StartupContext): void {
    this.events = ctx.events;
    this.target = document.querySelector<HTMLElement>(this.options.targetSelector);
    if (!this.target) {
      ctx.logger.debug("screensaver skipped: target not found", { selector: this.options.targetSelector });
      return;
    }

    document.addEventListener("mousemove", this.onActivityBound, { passive: true });
    document.addEventListener("keydown", this.onActivityBound, { passive: true });
    document.addEventListener("pointerdown", this.onActivityBound, { passive: true });

    this.armTimer(ctx);
  }

  destroy(): void {
    document.removeEventListener("mousemove", this.onActivityBound);
    document.removeEventListener("keydown", this.onActivityBound);
    document.removeEventListener("pointerdown", this.onActivityBound);
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.target) {
      this.target.hidden = true;
      this.target = null;
    }
    this.events = undefined;
  }

  private onActivity(): void {
    if (!this.target) return;
    const wasVisible = !this.target.hidden;
    this.target.hidden = true;
    if (wasVisible) {
      this.events?.emit("screensaver:hidden", { target: this.options.targetSelector });
    }
    this.events?.emit("user:active", { at: Date.now() });
    this.armTimer();
  }

  private armTimer(ctx?: StartupContext): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
    }

    const events = ctx?.events ?? this.events;

    this.timer = window.setTimeout(() => {
      if (!this.target) return;
      this.target.hidden = false;
      events?.emit("user:inactive", { at: Date.now(), idleMs: this.options.idleMs });
      events?.emit("screensaver:shown", { target: this.options.targetSelector });
    }, this.options.idleMs);
  }
}
