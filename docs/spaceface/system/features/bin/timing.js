export const VERSION = 'nextworld-1.3.0';
function createTimeout() {
    let id = null;
    return {
        get id() { return id; },
        set(fn, ms) {
            if (id !== null)
                clearTimeout(id);
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
export function debounce(func, delay = 300, immediate = false) {
    if (typeof func !== 'function') {
        throw new TypeError('Expected a function for debounce');
    }
    if (typeof delay !== 'number' || delay < 0) {
        throw new TypeError('Expected a non-negative number for delay');
    }
    const timer = createTimeout();
    function debounced(...args) {
        const callNow = immediate && timer.id === null;
        timer.set(() => {
            if (!immediate)
                func.apply(this, args);
        }, delay);
        if (callNow)
            func.apply(this, args);
    }
    debounced.cancel = () => timer.cancel();
    return debounced;
}
export function throttle(func, delay = 100, options = {}) {
    if (typeof func !== 'function') {
        throw new TypeError('Expected a function for throttle');
    }
    if (typeof delay !== 'number' || delay < 0) {
        throw new TypeError('Expected a non-negative number for delay');
    }
    const { leading = true, trailing = true } = options;
    let lastCall = 0;
    let lastArgs = null;
    let lastThis = null;
    const timer = createTimeout();
    function invoke() {
        lastCall = leading ? Date.now() : 0;
        func.apply(lastThis, lastArgs);
        lastArgs = lastThis = null;
    }
    function throttled(...args) {
        const now = Date.now();
        if (lastCall === 0 && !leading)
            lastCall = now;
        lastArgs = args;
        lastThis = this;
        const remaining = delay - (now - lastCall);
        if (remaining <= 0 || remaining > delay) {
            timer.cancel();
            invoke();
        }
        else if (timer.id === null && trailing) {
            timer.set(() => {
                if (trailing && lastArgs)
                    invoke();
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
//# sourceMappingURL=timing.js.map