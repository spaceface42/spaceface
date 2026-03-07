/**
 * Pure mathematical utilities for UI and physics calculations.
 */

/**
 * Restricts a value to be between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calculates the Euclidean distance between two points (ax, ay) and (bx, by).
 */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.hypot(dx, dy);
}

/**
 * Generates a normally distributed random number (Gaussian distribution).
 * Mean = 0, Standard Deviation = 1.
 */
export function gaussianRandom(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generates a random floating-point number between min (inclusive) and max (exclusive).
 * If max <= min, returns min.
 */
export function randomBetween(min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.random() * (max - min);
}
