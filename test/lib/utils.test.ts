import { describe, it, expect } from "vitest";
import { cn, daysUntil } from "@/lib/utils";

describe("cn", () => {
  it("merges class names correctly", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional class names", () => {
    const result = cn("base", false && "hidden", "visible");
    expect(result).toBe("base visible");
  });

  it("handles undefined and null values", () => {
    expect(cn("a", undefined, "b", null)).toBe("a b");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    // twMerge merges properly: px-4 overrides px-2
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles class-variance-authority array format", () => {
    const result = cn(["foo", "bar"], "baz");
    expect(result).toBe("foo bar baz");
  });
});

describe("daysUntil", () => {
  it("returns positive days for a future date", () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    expect(daysUntil(future)).toBe(3);
  });

  it("returns negative days for a past date", () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(daysUntil(past)).toBe(-3);
  });

  it("returns 0 for today", () => {
    expect(daysUntil(new Date())).toBe(0);
  });

  it("accepts date string input", () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    expect(daysUntil(future.toISOString())).toBe(5);
  });

  it("rounds up to the next day for partial days", () => {
    // 1.5 days from now should round up to 2
    const future = new Date(Date.now() + 36 * 60 * 60 * 1000);
    expect(daysUntil(future)).toBe(2);
  });
});
