import { describe, it, expect } from "vitest";
import { clamp, distance, gaussianRandom, randomBetween } from "./mathUtils.js";

describe("mathUtils", () => {
  describe("clamp", () => {
    it("returns the value if it is within bounds", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("returns the minimum if the value is below bounds", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("returns the maximum if the value is above bounds", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("works with negative bounds", () => {
      expect(clamp(-15, -20, -10)).toBe(-15);
      expect(clamp(-5, -20, -10)).toBe(-10);
      expect(clamp(-25, -20, -10)).toBe(-20);
    });
  });

  describe("distance", () => {
    it("returns 0 for the same point", () => {
      expect(distance(0, 0, 0, 0)).toBe(0);
      expect(distance(5, 5, 5, 5)).toBe(0);
    });

    it("calculates positive distance on axes", () => {
      expect(distance(0, 0, 3, 0)).toBe(3);
      expect(distance(0, 0, 0, 4)).toBe(4);
      expect(distance(3, 0, 0, 0)).toBe(3);
      expect(distance(0, 4, 0, 0)).toBe(4);
    });

    it("calculates distance between arbitrary points using Pythagorean theorem", () => {
      // 3-4-5 triangle
      expect(distance(0, 0, 3, 4)).toBe(5);
      expect(distance(1, 1, 4, 5)).toBe(5);
      expect(distance(-1, -1, 2, 3)).toBe(5);
    });
  });

  describe("randomBetween", () => {
    it("returns min if max <= min", () => {
      expect(randomBetween(5, 2)).toBe(5);
      expect(randomBetween(5, 5)).toBe(5);
    });

    it("returns a value between min and max", () => {
      const min = 10;
      const max = 20;
      for (let i = 0; i < 100; i++) {
        const val = randomBetween(min, max);
        expect(val).toBeGreaterThanOrEqual(min);
        expect(val).toBeLessThanOrEqual(max);
        // Technically max is exclusive in Math.random() unless it hits exactly 0.0 before scaling,
        // but toBeLessThanOrEqual covers the inclusive/exclusive edge case nicely.
      }
    });
  });

  describe("gaussianRandom", () => {
    it("returns a finite number", () => {
      for (let i = 0; i < 100; i++) {
        const val = gaussianRandom();
        expect(typeof val).toBe("number");
        expect(Number.isFinite(val)).toBe(true);
        expect(Number.isNaN(val)).toBe(false);
      }
    });

    it("produces values scattered around 0 (statistical smoke test)", () => {
      // Draw a small sample and ensure they aren't all exactly 0
      // Note: testing randomness is tricky, this is just to ensure it's doing *something*
      const samples = Array.from({ length: 50 }, () => gaussianRandom());
      const hasNonZero = samples.some((val) => val !== 0);
      const hasPositive = samples.some((val) => val > 0);
      const hasNegative = samples.some((val) => val < 0);

      expect(hasNonZero).toBe(true);
      expect(hasPositive).toBe(true);
      expect(hasNegative).toBe(true);
    });
  });
});
