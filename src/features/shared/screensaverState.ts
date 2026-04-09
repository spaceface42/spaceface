// src/features/shared/screensaverState.ts
import { createSignal } from "../../core/signals.js";

/**
 * A globally available reactive signal that is `true` when the Screensaver is visible
 * and `false` otherwise. Features that need screensaver-specific behavior can
 * subscribe here directly, while generic reusable features should prefer
 * `featurePauseSignal`.
 */
export const screensaverActiveSignal = createSignal<boolean>(false);
