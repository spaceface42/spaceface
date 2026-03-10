// src/features/shared/activity.ts
import { createSignal } from "../../core/signals.js";

/**
 * Global reactive signal broadcasting the timestamp of the last user interaction.
 * Features can subscribe to this directly without needing an EventBus.
 */
export const userActivitySignal = createSignal<number>(Date.now());

let isListening = false;
let lastMove = 0;
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

/**
 * Attaches the global activity listeners.
 * Should be called once during app startup.
 */
export function initActivityTracking(): void {
  if (isListening) return;
  isListening = true;
  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("keydown", onActivity, { passive: true });
  document.addEventListener("pointerdown", onActivity, { passive: true });
}

/**
 * Removes global activity listeners.
 */
export function destroyActivityTracking(): void {
  if (!isListening) return;
  isListening = false;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("keydown", onActivity);
  document.removeEventListener("pointerdown", onActivity);
}
