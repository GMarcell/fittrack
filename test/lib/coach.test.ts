import { describe, it, expect } from "vitest";
import { buildCoachMessages, truncate } from "@/lib/coach";

const history = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    role: i % 2 === 0 ? "user" : "assistant",
    content: `m${i}`,
  }));

describe("truncate", () => {
  it("leaves short text alone", () => {
    expect(truncate("hello", 100)).toBe("hello");
  });

  it("caps long text to exactly max characters and marks it", () => {
    const out = truncate("x".repeat(50), 20);
    expect(out).toHaveLength(20);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("buildCoachMessages", () => {
  const base = { history: [], report: "Sessions: 3", planSummary: "Push volume up", content: "How was my week?" };

  it("puts a single system message first and the new question last", () => {
    const msgs = buildCoachMessages(base);
    expect(msgs[0].role).toBe("system");
    expect(msgs.filter((m) => m.role === "system")).toHaveLength(1);
    expect(msgs[msgs.length - 1]).toEqual({ role: "user", content: "How was my week?" });
  });

  it("carries the plan and the logged performance into the system prompt", () => {
    const system = buildCoachMessages(base)[0].content;
    expect(system).toContain("Push volume up");
    expect(system).toContain("Sessions: 3");
  });

  it("says so when there is no plan yet", () => {
    const system = buildCoachMessages({ ...base, planSummary: null })[0].content;
    expect(system).toContain("No plan on file");
  });

  it("bounds each context block instead of overflowing the prompt", () => {
    const system = buildCoachMessages({
      ...base,
      report: "r".repeat(10_000),
      planSummary: "s".repeat(10_000),
    })[0].content;
    expect(system).toContain("…");
    expect(system.length).toBeLessThan(6000);
  });

  it("keeps only the most recent 20 turns, oldest first", () => {
    const msgs = buildCoachMessages({ ...base, history: history(30) });
    const turns = msgs.slice(1, -1);
    expect(turns).toHaveLength(20);
    expect(turns[0].content).toBe("m10");
    expect(turns[turns.length - 1].content).toBe("m29");
  });

  it("preserves coach turns and coerces anything unexpected to user", () => {
    const msgs = buildCoachMessages({
      ...base,
      history: [
        { role: "assistant", content: "lift the bar" },
        { role: "system", content: "stray row" },
      ],
    });
    expect(msgs[1]).toEqual({ role: "assistant", content: "lift the bar" });
    expect(msgs[2]).toEqual({ role: "user", content: "stray row" });
  });

  it("truncates an over-long individual message", () => {
    const msgs = buildCoachMessages({ ...base, content: "y".repeat(5000) });
    expect(msgs[msgs.length - 1].content).toHaveLength(2000);
  });
});
