// src/spaceface/system/features/bin/math.ts

export const VERSION = '2.0.0' as const;

/**
 * Clamps a number within the inclusive range specified by the minimum and maximum values.
 *
 * @param value - The number to clamp.
 * @param min - The lower bound of the range.
 * @param max - The upper bound of the range.
 * @returns The clamped value.
 * @throws Will throw an error if `min` is greater than `max`.
 */
export const clamp = (value: number, min: number, max: number): number => {
  if (min > max) {
    throw new RangeError('The `min` value cannot be greater than the `max` value.');
  }
  return Math.max(min, Math.min(value, max));
};

/**
 * Performs a linear interpolation between two values.
 *
 * @param a - The start value.
 * @param b - The end value.
 * @param t - The interpolation factor (typically between 0 and 1).
 * @returns The interpolated value.
 * @throws Will throw an error if `t` is not between 0 and 1.
 */
export const lerp = (a: number, b: number, t: number): number => {
  if (t < 0 || t > 1) {
    throw new RangeError('The interpolation factor `t` must be between 0 and 1.');
  }
  return (1 - t) * a + t * b;
};
