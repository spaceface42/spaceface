export const VERSION = 'nextworld-1.0.0' as const;

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

export const lerp = (a: number, b: number, t: number): number =>
  (1 - t) * a + t * b;
