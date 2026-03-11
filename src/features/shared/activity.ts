// src/features/shared/activity.ts
import { createSignal } from "../../core/signals.js";

/**
 * Global reactive signal broadcasting the timestamp of the last user interaction.
 * Features can subscribe to this directly without needing an EventBus.
 */
export const userActivitySignal = createSignal<number>(Date.now());

let isListening = false;
let lastMove = 0;
let lastWheel = 0;
const THROTTLE_MS = 120;

function onActivity() {
  userActivitySignal.value = Date.now();
}

function onMouseMove() {
  const now = Date.now();
  if (now - lastMove < THROTTLE_MS) return;
  lastMove = now;
  userActivitySignal.value = now;
}

function onWheel() {
  const now = Date.now();
  if (now - lastWheel < THROTTLE_MS) return;
  lastWheel = now;
  userActivitySignal.value = now;
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") {
    userActivitySignal.value = Date.now();
  }
}

/**
 * Attaches the global activity listeners.
 * Should be called once during app startup.
 */
export function initActivityTracking(): void {
  if (isListening) return;
  isListening = true;
  lastMove = 0;
  lastWheel = 0;
  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("wheel", onWheel, { passive: true });
  document.addEventListener("keydown", onActivity, { passive: true });
  document.addEventListener("pointerdown", onActivity, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
}

/**
 * Removes global activity listeners.
 */
export function destroyActivityTracking(): void {
  if (isListening) {
    isListening = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("wheel", onWheel);
    document.removeEventListener("keydown", onActivity);
    document.removeEventListener("pointerdown", onActivity);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }
  lastMove = 0;
  lastWheel = 0;
}
