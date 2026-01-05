import { describe, expect, it } from "bun:test";
import { useSessionStats } from "./useSessionStats";
import { createRoot } from "solid-js";

describe("useSessionStats", () => {
  it("should initialize with zero values", () => {
    createRoot((dispose) => {
      const stats = useSessionStats();
      
      expect(stats.tokens()).toEqual({
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
      });
      expect(stats.diff()).toEqual({
        additions: 0,
        deletions: 0,
        files: 0,
      });
      expect(stats.totalTokens()).toBe(0);
      
      dispose();
    });
  });

  it("should accumulate tokens", () => {
    createRoot((dispose) => {
      const stats = useSessionStats();
      
      stats.addTokens({ input: 100, output: 50 });
      expect(stats.tokens()).toEqual({
        input: 100,
        output: 50,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
      });
      expect(stats.totalTokens()).toBe(150);

      stats.addTokens({ input: 200, reasoning: 10 });
      expect(stats.tokens()).toEqual({
        input: 300,
        output: 50,
        reasoning: 10,
        cacheRead: 0,
        cacheWrite: 0,
      });
      expect(stats.totalTokens()).toBe(360);
      
      dispose();
    });
  });

  it("should update diff summary", () => {
    createRoot((dispose) => {
      const stats = useSessionStats();
      
      stats.setDiff({ additions: 10, deletions: 5, files: 2 });
      expect(stats.diff()).toEqual({
        additions: 10,
        deletions: 5,
        files: 2,
      });
      
      dispose();
    });
  });

  it("should reset stats", () => {
    createRoot((dispose) => {
      const stats = useSessionStats();
      
      stats.addTokens({ input: 100, output: 50 });
      stats.setDiff({ additions: 10, deletions: 5, files: 2 });
      
      stats.reset();
      
      expect(stats.tokens()).toEqual({
        input: 0,
        output: 0,
        reasoning: 0,
        cacheRead: 0,
        cacheWrite: 0,
      });
      expect(stats.diff()).toEqual({
        additions: 0,
        deletions: 0,
        files: 0,
      });
      expect(stats.totalTokens()).toBe(0);
      
      dispose();
    });
  });
});
