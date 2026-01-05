import { describe, expect, test } from "bun:test";
import { truncate, titlecase } from "./locale";

describe("locale utilities", () => {
  describe("truncate", () => {
    test("returns original string if length is less than or equal to limit", () => {
      expect(truncate("hello", 10)).toBe("hello");
      expect(truncate("hello", 5)).toBe("hello");
    });

    test("truncates string and adds ellipsis if length exceeds limit", () => {
      expect(truncate("hello world", 8)).toBe("hello...");
      expect(truncate("hello world", 5)).toBe("he...");
    });
  });

  describe("titlecase", () => {
    test("capitalizes first letter of each word", () => {
      expect(titlecase("hello world")).toBe("Hello World");
      expect(titlecase("HELLO WORLD")).toBe("Hello World");
      expect(titlecase("hello")).toBe("Hello");
    });

    test("handles mixed case", () => {
      expect(titlecase("hElLo wOrLd")).toBe("Hello World");
    });
  });
});
