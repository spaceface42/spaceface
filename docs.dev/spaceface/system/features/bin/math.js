export const VERSION = 'nextworld-1.3.0';
export const clamp = (value, min, max) => {
    if (min > max) {
        throw new RangeError('The `min` value cannot be greater than the `max` value.');
    }
    return Math.max(min, Math.min(value, max));
};
export const lerp = (a, b, t) => {
    if (t < 0 || t > 1) {
        throw new RangeError('The interpolation factor `t` must be between 0 and 1.');
    }
    return (1 - t) * a + t * b;
};
//# sourceMappingURL=math.js.map