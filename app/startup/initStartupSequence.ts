const DEFAULT_SELECTORS = {
  root: "[data-startup-sequence]",
  splash: "[data-startup-splash]",
  intro: "[data-startup-intro]",
  layout: "[data-startup-layout]",
} as const;

const DEFAULT_DELAY_MS = 2750;
const DEFAULT_EXIT_MS = 360;
const DEFAULT_INTRO_DELAY_RATIO = 0.38;

const ACTIVE_CLASS = "is-startup-active";
const INTRO_VISIBLE_CLASS = "is-startup-intro-visible";
const COMPLETE_CLASS = "is-startup-complete";
const LAYOUT_HIDDEN_CLASS = "is-startup-layout-hidden";
const LOCK_SCROLL_CLASS = "has-startup-lock";

const COMPLETE_ATTR = "data-startup-complete";
const DELAY_ATTR = "data-delay";
const DISMISS_ATTR = "data-dismiss-on-click";
const INTRO_DELAY_ATTR = "data-intro-delay";
const LAYOUT_TARGET_ATTR = "data-layout-target";

export interface StartupSequenceSelectors {
  root: string;
  splash: string;
  intro: string;
  layout: string;
}

export interface StartupSequenceOptions {
  root?: HTMLElement | null;
  selectors?: Partial<StartupSequenceSelectors>;
  delayMs?: number;
  introDelayMs?: number;
  exitMs?: number;
  dismissOnClick?: boolean;
  replay?: boolean;
  layoutTarget?: string;
}

export interface StartupSequenceHandle {
  root: HTMLElement;
  layout: HTMLElement;
  finish(): void;
  destroy(): void;
}

export function initStartupSequence(options: StartupSequenceOptions = {}): StartupSequenceHandle | null {
  const body = document.body;
  if (!(body instanceof HTMLElement)) {
    return null;
  }

  const selectors = { ...DEFAULT_SELECTORS, ...options.selectors };
  const root = options.root ?? body.querySelector<HTMLElement>(selectors.root);
  if (!(root instanceof HTMLElement)) {
    return null;
  }

  const splash = root.querySelector<HTMLElement>(selectors.splash);
  const intro = root.querySelector<HTMLElement>(selectors.intro);
  const layout = resolveLayout(root, body, selectors.layout, options.layoutTarget);

  if (!(splash instanceof HTMLElement) || !(intro instanceof HTMLElement) || !(layout instanceof HTMLElement)) {
    return null;
  }

  const layoutIsNested = layout.closest(selectors.root) === root;
  if (!options.replay && root.getAttribute(COMPLETE_ATTR) === "true") {
    body.classList.remove(LOCK_SCROLL_CLASS);
    layout.classList.remove(LAYOUT_HIDDEN_CLASS);
    intro.classList.add("is-hidden");
    if (!layoutIsNested) {
      root.hidden = true;
    }
    return createHandle(root, layout, noop, noop);
  }

  root.removeAttribute(COMPLETE_ATTR);

  const delayMs = resolveDuration(options.delayMs, root.getAttribute(DELAY_ATTR), DEFAULT_DELAY_MS);
  const introDelayMs = Math.min(
    resolveDuration(
      options.introDelayMs,
      root.getAttribute(INTRO_DELAY_ATTR),
      Math.round(delayMs * DEFAULT_INTRO_DELAY_RATIO)
    ),
    delayMs
  );
  const exitMs = resolveDuration(options.exitMs, null, DEFAULT_EXIT_MS);
  const dismissOnClick = resolveBoolean(options.dismissOnClick, root.getAttribute(DISMISS_ATTR), true);

  let introTimer: ReturnType<typeof setTimeout> | null = null;
  let finishTimer: ReturnType<typeof setTimeout> | null = null;
  let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let finished = false;

  const clearTimers = (): void => {
    if (introTimer !== null) {
      clearTimeout(introTimer);
      introTimer = null;
    }
    if (finishTimer !== null) {
      clearTimeout(finishTimer);
      finishTimer = null;
    }
    if (cleanupTimer !== null) {
      clearTimeout(cleanupTimer);
      cleanupTimer = null;
    }
  };

  const cleanupVisualState = (): void => {
    body.classList.remove(LOCK_SCROLL_CLASS);
    layout.classList.remove(LAYOUT_HIDDEN_CLASS);
    root.classList.remove(ACTIVE_CLASS, INTRO_VISIBLE_CLASS, COMPLETE_CLASS);
    intro.classList.add("is-hidden");

    if (!layoutIsNested) {
      root.hidden = true;
    }
  };

  const removeDismissListener = (): void => {
    if (dismissOnClick) {
      root.removeEventListener("click", handleDismiss);
    }
  };

  const finish = (): void => {
    if (destroyed || finished) {
      return;
    }

    finished = true;
    if (introTimer !== null) {
      clearTimeout(introTimer);
      introTimer = null;
    }
    if (finishTimer !== null) {
      clearTimeout(finishTimer);
      finishTimer = null;
    }

    root.setAttribute(COMPLETE_ATTR, "true");
    removeDismissListener();

    body.classList.remove(LOCK_SCROLL_CLASS);
    layout.classList.remove(LAYOUT_HIDDEN_CLASS);
    root.classList.add(COMPLETE_CLASS);

    cleanupTimer = setTimeout(() => {
      if (destroyed) {
        return;
      }
      cleanupVisualState();
      cleanupTimer = null;
    }, exitMs);
  };

  const destroy = (): void => {
    if (destroyed) {
      return;
    }

    destroyed = true;
    clearTimers();
    removeDismissListener();
    cleanupVisualState();
  };

  const handleDismiss = (): void => {
    finish();
  };

  intro.classList.add("is-hidden");
  root.classList.remove(INTRO_VISIBLE_CLASS, COMPLETE_CLASS);
  root.classList.add(ACTIVE_CLASS);
  layout.classList.add(LAYOUT_HIDDEN_CLASS);
  body.classList.add(LOCK_SCROLL_CLASS);
  root.hidden = false;

  introTimer = setTimeout(() => {
    if (destroyed || finished) {
      return;
    }
    root.classList.add(INTRO_VISIBLE_CLASS);
    intro.classList.remove("is-hidden");
    introTimer = null;
  }, introDelayMs);

  finishTimer = setTimeout(() => {
    finish();
  }, delayMs);

  if (dismissOnClick) {
    root.addEventListener("click", handleDismiss);
  }

  return createHandle(root, layout, finish, destroy);
}

function createHandle(
  root: HTMLElement,
  layout: HTMLElement,
  finish: () => void,
  destroy: () => void
): StartupSequenceHandle {
  return {
    root,
    layout,
    finish,
    destroy,
  };
}

function resolveLayout(
  root: HTMLElement,
  body: HTMLElement,
  layoutSelector: string,
  layoutTarget?: string
): HTMLElement | null {
  const nestedLayout = root.querySelector<HTMLElement>(layoutSelector);
  if (nestedLayout instanceof HTMLElement) {
    return nestedLayout;
  }

  const targetedSelector = layoutTarget?.trim() || root.getAttribute(LAYOUT_TARGET_ATTR)?.trim() || "";
  if (targetedSelector) {
    const targetedLayout = body.querySelector<HTMLElement>(targetedSelector);
    if (targetedLayout instanceof HTMLElement) {
      return targetedLayout;
    }
  }

  const documentLayout = body.querySelector<HTMLElement>(layoutSelector);
  return documentLayout instanceof HTMLElement ? documentLayout : null;
}

function resolveDuration(optionValue: number | undefined, rawValue: string | null, fallback: number): number {
  const candidate = optionValue ?? readDuration(rawValue);
  if (typeof candidate !== "number" || !Number.isFinite(candidate) || candidate < 0) {
    return fallback;
  }
  return candidate;
}

function readDuration(rawValue: string | null): number | null {
  if (rawValue === null) {
    return null;
  }

  const value = Number(rawValue.trim());
  return Number.isFinite(value) ? value : null;
}

function resolveBoolean(optionValue: boolean | undefined, rawValue: string | null, fallback: boolean): boolean {
  if (typeof optionValue === "boolean") {
    return optionValue;
  }

  if (rawValue === null) {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "" || normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false;
  }
  return fallback;
}

function noop(): void {}
