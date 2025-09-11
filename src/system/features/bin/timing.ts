// src/spaceface/system/features/bin/timing.ts

export const VERSION = 'nextworld-1.0.0' as const;

/** Generic type: function with cancel method */
export type CancellableFunction<T extends (...args: any[]) => void> = T & { cancel: () => void };

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
 * have elapsed since the last call.
 *
 * @example
 * ```ts
 * const saveInput = debounce((value: string) => console.log("Saving:", value), 300);
 * saveInput("Hello");
 * saveInput.cancel(); // cancels any pending call
 * ```
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay = 300,
  immediate = false
): CancellableFunction<(...args: Parameters<T>) => void> {
  const timer = createTimeout();

  function debounced(this: ThisParameterType<T>, ...args: Parameters<T>) {
    const callNow = immediate && timer.id === null;

    timer.set(() => {
      if (!immediate) func.apply(this, args);
    }, delay);

    if (callNow) func.apply(this, args);
  }

  debounced.cancel = () => timer.cancel();

  return debounced;
}

/**
 * Creates a throttled function that invokes `func` at most once per `delay` ms.
 *
 * @example
 * ```ts
 * const logScroll = throttle(() => console.log("Scroll!"), 500, { leading: true, trailing: true });
 * window.addEventListener("scroll", logScroll);
 * logScroll.cancel(); // cancels any pending trailing call
 * ```
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay = 100,
  options: { leading?: boolean; trailing?: boolean } = {}
): CancellableFunction<(...args: Parameters<T>) => void> {
  const { leading = true, trailing = true } = options;
  let lastCall = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: ThisParameterType<T> | null = null;
  const timer = createTimeout();

  function invoke() {
    lastCall = leading ? Date.now() : 0;
    func.apply(lastThis!, lastArgs!);
    lastArgs = lastThis = null;
  }

  function throttled(this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now();
    if (lastCall === 0 && !leading) lastCall = now;

    lastArgs = args;
    lastThis = this;

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
    lastArgs = lastThis = null;
  };

  return throttled;
}
