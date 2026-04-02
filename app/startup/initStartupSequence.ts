const DEFAULT_DELAY_MS = 2750;
const DEFAULT_EXIT_MS = 360;
const DEFAULT_INTRO_DELAY_MS = 920;
const DEFAULT_LAYOUT_SELECTOR = "#app";

const ACTIVE_CLASS = "is-startup-active";
const INTRO_VISIBLE_CLASS = "is-startup-intro-visible";
const COMPLETE_CLASS = "is-startup-complete";
const LAYOUT_HIDDEN_CLASS = "is-startup-layout-hidden";
const LOCK_SCROLL_CLASS = "has-startup-lock";

export function initStartupSequence(): void {
  const body = document.body;
  if (!(body instanceof HTMLElement)) {
    return;
  }

  const root = body.querySelector<HTMLElement>("[data-startup-sequence]");
  const splash = root?.querySelector<HTMLElement>("[data-startup-splash]");
  const intro = root?.querySelector<HTMLElement>("[data-startup-intro]");
  const layoutSelector = root?.getAttribute("data-layout-target")?.trim() || DEFAULT_LAYOUT_SELECTOR;
  const layout = body.querySelector<HTMLElement>(layoutSelector);

  if (!(root instanceof HTMLElement) || !(splash instanceof HTMLElement) || !(intro instanceof HTMLElement) || !(layout instanceof HTMLElement)) {
    return;
  }

  if (root.getAttribute("data-startup-complete") === "true") {
    body.classList.remove(LOCK_SCROLL_CLASS);
    layout.classList.remove(LAYOUT_HIDDEN_CLASS);
    intro.classList.add("is-hidden");
    root.hidden = true;
    return;
  }

  const delayMs = readDuration(root.getAttribute("data-delay"), DEFAULT_DELAY_MS);
  const introDelayMs = Math.min(readDuration(root.getAttribute("data-intro-delay"), DEFAULT_INTRO_DELAY_MS), delayMs);
  const dismissOnClick = readBoolean(root.getAttribute("data-dismiss-on-click"), true);

  let finished = false;
  let introTimer: ReturnType<typeof setTimeout> | null = null;
  let finishTimer: ReturnType<typeof setTimeout> | null = null;
  let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

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

  const cleanup = (): void => {
    body.classList.remove(LOCK_SCROLL_CLASS);
    layout.classList.remove(LAYOUT_HIDDEN_CLASS);
    root.classList.remove(ACTIVE_CLASS, INTRO_VISIBLE_CLASS, COMPLETE_CLASS);
    intro.classList.add("is-hidden");
    root.hidden = true;
  };

  const finish = (): void => {
    if (finished) {
      return;
    }

    finished = true;
    clearTimers();
    root.setAttribute("data-startup-complete", "true");
    body.classList.remove(LOCK_SCROLL_CLASS);
    layout.classList.remove(LAYOUT_HIDDEN_CLASS);
    root.classList.add(COMPLETE_CLASS);

    if (dismissOnClick) {
      root.removeEventListener("click", finish);
    }

    cleanupTimer = setTimeout(cleanup, DEFAULT_EXIT_MS);
  };

  intro.classList.add("is-hidden");
  root.hidden = false;
  root.classList.remove(INTRO_VISIBLE_CLASS, COMPLETE_CLASS);
  root.classList.add(ACTIVE_CLASS);
  layout.classList.add(LAYOUT_HIDDEN_CLASS);
  body.classList.add(LOCK_SCROLL_CLASS);

  introTimer = setTimeout(() => {
    root.classList.add(INTRO_VISIBLE_CLASS);
    intro.classList.remove("is-hidden");
    introTimer = null;
  }, introDelayMs);

  finishTimer = setTimeout(finish, delayMs);

  if (dismissOnClick) {
    root.addEventListener("click", finish);
  }
}

function readDuration(rawValue: string | null, fallback: number): number {
  const value = Number(rawValue?.trim());
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readBoolean(rawValue: string | null, fallback: boolean): boolean {
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
