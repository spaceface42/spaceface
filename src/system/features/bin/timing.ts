// src/spaceface/system/features/bin/timing.ts

export const VERSION = '2.0.0' as const;

/** Generic type: function with cancel method */
export type CancellableFunction<T> = T & { cancel: () => void };

/** Internal helper: manages a timeout with cancel support */
function createTimeout(): { id: number | null; set: (fn: () => void, ms: number) => void; cancel: () => void } {
  let id: number | null = null;

  return {
    get id() { return id; },
    set(fn: () => void, ms: number) {
      if (id !== null) clearTimeout(id);
      id = window.setTimeout(() => {
        id = null;
        fn();
      }, ms);
    },
    cancel() {
      if (id !== null) {
        clearTimeout(id);
        id = null;
      }
    },
  };
}

/**
 * Creates a debounced function that delays invoking `func` until after `delay` ms
 * have elapsed since the last call. Includes error handling for invalid inputs.
 *
 * @param func - The function to debounce.
 * @param delay - The number of milliseconds to delay.
 * @param immediate - If `true`, trigger the function on the leading edge.
 * @returns A debounced function with a `cancel` method.
 */
export function debounce<Args extends unknown[]>(
  func: (...args: Args) => void,
  delay = 300,
  immediate = false
): CancellableFunction<(...args: Args) => void> {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function for debounce');
  }
  if (typeof delay !== 'number' || delay < 0) {
    throw new TypeError('Expected a non-negative number for delay');
  }

  const timer = createTimeout();

  function debounced(...args: Args) {
    const callNow = immediate && timer.id === null;

    timer.set(() => {
      if (!immediate) func(...args);
    }, delay);

    if (callNow) func(...args);
  }

  debounced.cancel = () => timer.cancel();

  return debounced;
}

/**
 * Creates a throttled function that invokes `func` at most once per `delay` ms.
 * Includes error handling for invalid inputs.
 *
 * @param func - The function to throttle.
 * @param delay - The number of milliseconds to throttle calls.
 * @param options - Options to control leading and trailing edge calls.
 * @returns A throttled function with a `cancel` method.
 */
export function throttle<Args extends unknown[]>(
  func: (...args: Args) => void,
  delay = 100,
  options: { leading?: boolean; trailing?: boolean } = {}
): CancellableFunction<(...args: Args) => void> {
  if (typeof func !== 'function') {
    throw new TypeError('Expected a function for throttle');
  }
  if (typeof delay !== 'number' || delay < 0) {
    throw new TypeError('Expected a non-negative number for delay');
  }

  const { leading = true, trailing = true } = options;
  let lastCall = 0;
  let lastArgs: Args | null = null;
  const timer = createTimeout();

  function invoke() {
    lastCall = leading ? Date.now() : 0;
    if (!lastArgs) return;
    func(...lastArgs);
    lastArgs = null;
  }

  function throttled(...args: Args) {
    const now = Date.now();
    if (lastCall === 0 && !leading) lastCall = now;

    lastArgs = args;

    const remaining = delay - (now - lastCall);

    if (remaining <= 0 || remaining > delay) {
      timer.cancel();
      invoke();
    } else if (timer.id === null && trailing) {
      timer.set(() => {
        if (trailing && lastArgs) invoke();
      }, remaining);
    }
  }

  throttled.cancel = () => {
    timer.cancel();
    lastCall = 0;
    lastArgs = null;
  };

  return throttled;
}
