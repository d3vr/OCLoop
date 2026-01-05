
import { describe, expect, test } from "bun:test";
import { formatTokenCount, truncateText, formatDiffSummary, getToolPreview } from "./format";

describe("format utilities", () => {
  test("formatTokenCount formats numbers with separators", () => {
    // Note: toLocaleString behavior depends on locale, but standard envs usually default to something that uses commas or spaces
    // We check that it at least changes the string for large numbers or keeps it for small
    expect(formatTokenCount(100)).toBe("100");
    const formatted1000 = formatTokenCount(1000);
    expect(formatted1000.length).toBeGreaterThan(4); // "1,000" or "1 000"
  });

  test("truncateText truncates correctly", () => {
    expect(truncateText("hello world", 11)).toBe("hello world");
    expect(truncateText("hello world", 10)).toBe("hello w...");
    expect(truncateText("hello", 5)).toBe("hello");
    expect(truncateText("hello", 4)).toBe("h...");
  });

  test("truncateText normalizes whitespace", () => {
    expect(truncateText("hello\nworld", 20)).toBe("hello world");
    expect(truncateText("hello   world", 20)).toBe("hello world");
    expect(truncateText("  hello world  ", 20)).toBe("hello world");
    expect(truncateText("line 1\nline 2", 10)).toBe("line 1 ...");
  });

  test("formatDiffSummary formats correctly", () => {
    expect(formatDiffSummary(10, 5, 2)).toBe("+10/-5 (2)");
  });

  test("getToolPreview extracts info correctly", () => {
    expect(getToolPreview("bash", { command: "ls -la" })).toBe("ls -la");
    expect(getToolPreview("read", { filePath: "/path/to/file.txt" })).toBe("file.txt");
    expect(getToolPreview("write", { filePath: "C:\\Windows\\System32\\config.sys" })).toBe("config.sys");
    expect(getToolPreview("glob", { pattern: "*.ts" })).toBe("*.ts");
    expect(getToolPreview("unknown", {})).toBe("unknown");
  });
});
