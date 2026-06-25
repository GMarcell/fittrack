import { describe, it, expect } from "vitest";
import {
  QUESTIONS,
  BAND_VALUES,
  BAND_VALUES_BY_KEY,
  getBandValue,
} from "@/lib/onboarding";
import { StatType } from "@prisma/client";

describe("QUESTIONS", () => {
  it("has exactly 8 questions", () => {
    expect(QUESTIONS).toHaveLength(8);
  });

  it("each question has a unique key", () => {
    const keys = QUESTIONS.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("each question has 4 answer options (A-D)", () => {
    for (const q of QUESTIONS) {
      expect(q.options).toHaveLength(4);
      const bands = q.options.map((o) => o.band);
      expect(bands).toEqual(["A", "B", "C", "D"]);
    }
  });

  it("each question maps to valid stat types", () => {
    const validStats = Object.values(StatType);
    for (const q of QUESTIONS) {
      for (const stat of q.stats) {
        expect(validStats).toContain(stat);
      }
    }
  });

  it("all questions have labels for each option", () => {
    for (const q of QUESTIONS) {
      for (const opt of q.options) {
        expect(opt.label).toBeTruthy();
        expect(typeof opt.label).toBe("string");
      }
    }
  });

  it("covers all 8 stat types across all questions", () => {
    const coveredStats = new Set(QUESTIONS.flatMap((q) => q.stats));
    expect(coveredStats.size).toBe(8);
    const allStats = Object.values(StatType);
    for (const stat of allStats) {
      expect(coveredStats.has(stat)).toBe(true);
    }
  });

  it("push-ups and pull-ups map to STR", () => {
    const pushups = QUESTIONS.find((q) => q.key === "max_pushups");
    expect(pushups?.stats).toContain(StatType.STR);

    const pullups = QUESTIONS.find((q) => q.key === "max_pullups");
    expect(pullups?.stats).toContain(StatType.STR);
  });

  it("5k run maps to END", () => {
    const run = QUESTIONS.find((q) => q.key === "five_k_run");
    expect(run?.stats).toContain(StatType.END);
  });

  it("sprint maps to SPD and PWR", () => {
    const sprint = QUESTIONS.find((q) => q.key === "sprint_ability");
    expect(sprint?.stats).toContain(StatType.SPD);
    expect(sprint?.stats).toContain(StatType.PWR);
  });

  it("training days maps to DSC", () => {
    const days = QUESTIONS.find((q) => q.key === "training_days");
    expect(days?.stats).toContain(StatType.DSC);
  });
});

describe("BAND_VALUES", () => {
  it("has values A=12, B=22, C=30, D=38", () => {
    expect(BAND_VALUES).toEqual({
      A: 12,
      B: 22,
      C: 30,
      D: 38,
    });
  });
});

describe("BAND_VALUES_BY_KEY", () => {
  it("has specific overrides for pushups, pullups, and flexibility", () => {
    expect(BAND_VALUES_BY_KEY).toHaveProperty("max_pushups");
    expect(BAND_VALUES_BY_KEY).toHaveProperty("max_pullups");
    expect(BAND_VALUES_BY_KEY).toHaveProperty("flexibility");
  });

  it("pushups override has correct values", () => {
    expect(BAND_VALUES_BY_KEY.max_pushups).toEqual({
      A: 12,
      B: 20,
      C: 30,
      D: 38,
    });
  });

  it("flexibility override has lower D value", () => {
    expect(BAND_VALUES_BY_KEY.flexibility?.D).toBe(36);
  });
});

describe("getBandValue", () => {
  it("returns default band value for non-overridden keys", () => {
    expect(getBandValue("five_k_run", "A")).toBe(12);
    expect(getBandValue("five_k_run", "B")).toBe(22);
    expect(getBandValue("five_k_run", "C")).toBe(30);
    expect(getBandValue("five_k_run", "D")).toBe(38);
  });

  it("returns overridden value for pushups", () => {
    expect(getBandValue("max_pushups", "B")).toBe(20);
  });

  it("returns overridden value for flexibility", () => {
    expect(getBandValue("flexibility", "D")).toBe(36);
  });

  it("returns 12 for band A across all keys", () => {
    for (const q of QUESTIONS) {
      expect(getBandValue(q.key, "A")).toBe(12);
    }
  });
});
