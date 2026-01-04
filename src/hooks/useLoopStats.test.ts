import { describe, expect, it } from "bun:test";
import { formatDuration } from "./useLoopStats";

describe("formatDuration", () => {
  describe("seconds only", () => {
    it("should format 0 milliseconds as 0s", () => {
      expect(formatDuration(0)).toBe("0s");
    });

    it("should format sub-second as 0s", () => {
      expect(formatDuration(500)).toBe("0s");
    });

    it("should format 1 second", () => {
      expect(formatDuration(1000)).toBe("1s");
    });

    it("should format 45 seconds", () => {
      expect(formatDuration(45000)).toBe("45s");
    });

    it("should format 59 seconds", () => {
      expect(formatDuration(59000)).toBe("59s");
    });
  });

  describe("minutes and seconds", () => {
    it("should format 1 minute exactly as 1m", () => {
      expect(formatDuration(60000)).toBe("1m");
    });

    it("should format 1 minute 23 seconds", () => {
      expect(formatDuration(83000)).toBe("1m 23s");
    });

    it("should format 15 minutes exactly", () => {
      expect(formatDuration(15 * 60 * 1000)).toBe("15m");
    });

    it("should format 59 minutes 59 seconds", () => {
      expect(formatDuration(59 * 60 * 1000 + 59 * 1000)).toBe("59m 59s");
    });
  });

  describe("hours and minutes", () => {
    it("should format 1 hour exactly as 1h", () => {
      expect(formatDuration(60 * 60 * 1000)).toBe("1h");
    });

    it("should format 1 hour 15 minutes", () => {
      expect(formatDuration(75 * 60 * 1000)).toBe("1h 15m");
    });

    it("should format 2 hours 30 minutes", () => {
      expect(formatDuration(2.5 * 60 * 60 * 1000)).toBe("2h 30m");
    });

    it("should format hours only when minutes are 0", () => {
      expect(formatDuration(3 * 60 * 60 * 1000)).toBe("3h");
    });

    it("should drop seconds when hours are present", () => {
      // 1h 15m 45s should show as 1h 15m
      expect(formatDuration(75 * 60 * 1000 + 45 * 1000)).toBe("1h 15m");
    });
  });

  describe("edge cases", () => {
    it("should handle negative values as 0s", () => {
      expect(formatDuration(-1000)).toBe("0s");
    });

    it("should handle very large values", () => {
      // 25 hours 30 minutes
      expect(formatDuration(25.5 * 60 * 60 * 1000)).toBe("25h 30m");
    });
  });
});

// Note: The useLoopStats hook uses SolidJS reactive primitives (createSignal, createMemo).
// Testing the full reactive behavior would require a SolidJS testing environment.
// The formatDuration utility is a pure function and can be tested directly.
// Additional integration tests would be useful for the hook's timing logic.
