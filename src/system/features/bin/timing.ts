export const VERSION = 'nextworld-1.0.0';

/**
 * Creates a debounced function that delays invoking `func` until after `delay` ms
 * have elapsed since the last time the debounced function was called.
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay = 300,
  immediate = false
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  function debounced(this: ThisParameterType<T>, ...args: Parameters<T>) {
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    }, delay);

    if (callNow) func.apply(this, args);
  }

  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that invokes `func` at most once per every `delay` ms.
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay = 100,
  options: { leading?: boolean; trailing?: boolean } = {}
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  const { leading = true, trailing = true } = options;
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: ThisParameterType<T> | null = null;

  function invoke() {
    lastCall = leading ? Date.now() : 0;
    func.apply(lastThis!, lastArgs!);
    lastArgs = lastThis = null;
  }

  function throttled(this: ThisParameterType<T>, ...args: Parameters<T>) {
    const now = Date.now();
    if (!lastCall && !leading) lastCall = now;

    const remaining = delay - (now - lastCall);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0 || remaining > delay) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      invoke();
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        timeout = null;
        if (trailing && lastArgs) invoke();
      }, remaining);
    }
  }

  throttled.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    lastCall = 0;
    lastArgs = lastThis = null;
  };

  return throttled;
}
