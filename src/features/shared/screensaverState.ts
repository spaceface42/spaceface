// src/features/shared/screensaverState.ts
import { createSignal } from "../../core/signals.js";

/**
 * A globally available reactive signal that is `true` when the Screensaver is visible
 * and `false` otherwise. Other features (like the Slideshow) can subscribe to this
 * to pause themselves while the screensaver is playing.
 */
export const screensaverActiveSignal = createSignal<boolean>(false);
