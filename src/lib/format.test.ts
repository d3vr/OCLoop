
import { describe, expect, test } from "bun:test";
import { formatTokenCount, truncateText, formatDiffSummary, getToolPreview, stripMarkdown } from "./format";

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

  test("stripMarkdown removes markdown formatting", () => {
    expect(stripMarkdown("**Bold** text")).toBe("Bold text");
    expect(stripMarkdown("*Italic* text")).toBe("Italic text");
    expect(stripMarkdown("_Italic_ text")).toBe("Italic text");
    expect(stripMarkdown("`Code` inline")).toBe("Code inline");
    expect(stripMarkdown("[Link](http://example.com)")).toBe("Link");
    expect(stripMarkdown("# Header")).toBe("Header");
    expect(stripMarkdown("- List item")).toBe("List item");
    expect(stripMarkdown("1. Numbered item")).toBe("Numbered item");
    expect(stripMarkdown("Mixed **bold** and `code`")).toBe("Mixed bold and code");
  });
});
