import { createEffect, type Feature, type FeatureMountContext } from "../../src/spaceface.js";

/**
 * Minimal custom-feature example that depends only on the public package API.
 *
 * Mount with `data-feature="public-api-example"` and the registry will provide
 * the logger, abort signal, and stable runtime services through mount context.
 */
export class PauseAwareStatusFeature implements Feature {
  private cleanupEffect?: () => void;
  private root: HTMLElement | null = null;

  mount(el: HTMLElement, context?: FeatureMountContext): void {
    this.root = el;
    this.root.setAttribute("role", "status");

    context?.logger.info("public api example mounted", {
      featureId: "public-api-example",
    });

    this.cleanupEffect = createEffect(() => {
      const paused = context?.services.pause.signal.value ?? false;
      const lastActivity = context?.services.activity.signal.value ?? 0;
      const schedulerState = context?.services.scheduler.frame.isRunning ? "running" : "ready";
      const partialsState = typeof context?.services.partials.loadHtml === "function" ? "partials" : "no-partials";

      if (!this.root) return;
      this.root.textContent = `${paused ? "paused" : "active"}:${lastActivity}:${schedulerState}:${partialsState}`;
      this.root.setAttribute("aria-busy", paused ? "true" : "false");
      this.root.setAttribute("title", "public-api-example");
    });
  }

  destroy(): void {
    this.cleanupEffect?.();
    this.cleanupEffect = undefined;
    this.root = null;
  }
}
