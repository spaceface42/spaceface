import { screensaverActiveSignal } from "./screensaverState.js";

/**
 * Generic pause signal for reusable page features.
 *
 * The current runtime still derives pause state from the screensaver shell,
 * but reusable features should depend on this alias unless they need
 * screensaver-specific behavior.
 */
export const featurePauseSignal = screensaverActiveSignal;
