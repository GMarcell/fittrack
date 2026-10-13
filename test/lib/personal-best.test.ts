import { describe, it, expect } from "vitest";
import {
  BODY_METRIC_PRESETS,
  EXERCISE_PRESETS,
  PERSONAL_BEST_UNITS,
  attemptInputSchema,
  computeBest,
  daysSince,
  defaultDirection,
  estimateOneRepMax,
  formatRelativeDays,
  formatValue,
  isBetterValue,
  personalBestInputSchema,
  presetsFor,
  supportsReps,
  targetProgress,
  unitsFor,
  updatePersonalBestSchema,
} from "@/lib/personal-best";

describe("defaultDirection", () => {
  it("treats body metrics as latest-value records", () => {
    expect(defaultDirection("BODY_METRIC", "KG")).toBe("LATEST");
    expect(defaultDirection("BODY_METRIC", "PERCENT")).toBe("LATEST");
  });

  it("guesses lower-is-better for timed units without a preset", () => {
    expect(defaultDirection("EXERCISE", "SECONDS")).toBe("LOWER");
    expect(defaultDirection("EXERCISE", "MINUTES")).toBe("LOWER");
  });

  it("guesses higher-is-better for everything else", () => {
    expect(defaultDirection("EXERCISE", "REPS")).toBe("HIGHER");
    expect(defaultDirection("EXERCISE", "KG")).toBe("HIGHER");
    expect(defaultDirection("EXERCISE", "KM")).toBe("HIGHER");
  });
});

describe("preset directions", () => {
  const byName = (name: string) =>
    EXERCISE_PRESETS.find((p) => p.name === name);

  it("scores holds in seconds as higher-is-better", () => {
    expect(byName("Plank Hold")?.direction).toBe("HIGHER");
    expect(byName("Wall Sit")?.direction).toBe("HIGHER");
    expect(byName("Dead Hang")?.direction).toBe("HIGHER");
  });

  it("scores sprints and runs as lower-is-better", () => {
    expect(byName("40m Sprint")?.direction).toBe("LOWER");
    expect(byName("5km Run")?.direction).toBe("LOWER");
    expect(byName("1km Run")?.direction).toBe("LOWER");
  });

  it("scores strength lifts as higher-is-better", () => {
    expect(byName("Deadlift")?.direction).toBe("HIGHER");
    expect(byName("Max Pull-ups")?.direction).toBe("HIGHER");
  });

  it("marks every body metric as latest-value", () => {
    for (const preset of BODY_METRIC_PRESETS) {
      expect(preset.direction).toBe("LATEST");
    }
  });
});

describe("isBetterValue", () => {
  it("compares higher-is-better records", () => {
    expect(isBetterValue(11, 10, "HIGHER")).toBe(true);
    expect(isBetterValue(9, 10, "HIGHER")).toBe(false);
    expect(isBetterValue(10, 10, "HIGHER")).toBe(false);
  });

  it("compares lower-is-better records", () => {
    expect(isBetterValue(21, 22, "LOWER")).toBe(true);
    expect(isBetterValue(23, 22, "LOWER")).toBe(false);
    expect(isBetterValue(22, 22, "LOWER")).toBe(false);
  });

  it("always accepts the newest entry for latest-value records", () => {
    expect(isBetterValue(80, 70, "LATEST")).toBe(true);
    expect(isBetterValue(60, 70, "LATEST")).toBe(true);
  });
});

describe("computeBest", () => {
  it("returns null with no attempts", () => {
    expect(computeBest([], "HIGHER")).toBeNull();
  });

  it("picks the highest value for higher-is-better records", () => {
    const best = computeBest(
      [
        { value: 30, date: "2026-01-01" },
        { value: 45, date: "2026-02-01" },
        { value: 38, date: "2026-03-01" },
      ],
      "HIGHER",
    );

    expect(best?.value).toBe(45);
    expect(best?.date.toISOString().slice(0, 10)).toBe("2026-02-01");
  });

  it("picks the longest hold for a higher-is-better timed record", () => {
    const best = computeBest(
      [
        { value: 95, date: "2026-01-01" },
        { value: 120, date: "2026-02-01" },
        { value: 142, date: "2026-03-01" },
      ],
      "HIGHER",
    );

    expect(best?.value).toBe(142);
  });

  it("picks the fastest time for lower-is-better records", () => {
    const best = computeBest(
      [
        { value: 27.5, date: "2026-01-01" },
        { value: 25.4, date: "2026-02-01" },
        { value: 26.1, date: "2026-03-01" },
      ],
      "LOWER",
    );

    expect(best?.value).toBe(25.4);
    expect(best?.date.toISOString().slice(0, 10)).toBe("2026-02-01");
  });

  it("picks the most recent entry for latest-value records", () => {
    const best = computeBest(
      [
        { value: 78.4, date: "2026-03-01" },
        { value: 77.1, date: "2026-01-01" },
      ],
      "LATEST",
    );

    expect(best?.value).toBe(78.4);
    expect(best?.date.toISOString().slice(0, 10)).toBe("2026-03-01");
  });

  it("ignores the order attempts are supplied in", () => {
    const best = computeBest(
      [
        { value: 50, date: "2026-06-01" },
        { value: 20, date: "2026-01-01" },
      ],
      "LATEST",
    );

    expect(best?.value).toBe(50);
  });
});

describe("presets and units", () => {
  it("returns sensible units per category", () => {
    expect(unitsFor("EXERCISE")).toContain("REPS");
    expect(unitsFor("BODY_METRIC")).not.toContain("REPS");
    expect(unitsFor("BODY_METRIC")).toContain("KG");
  });

  it("offers a custom option in every preset list", () => {
    for (const presets of [presetsFor("EXERCISE"), presetsFor("BODY_METRIC")]) {
      expect(presets.some((p) => p.name.startsWith("Custom"))).toBe(true);
    }
  });

  it("only uses units from the shared unit list", () => {
    for (const preset of [...EXERCISE_PRESETS, ...BODY_METRIC_PRESETS]) {
      expect(PERSONAL_BEST_UNITS).toContain(preset.unit);
    }
  });
});

describe("estimateOneRepMax", () => {
  it("applies Epley's formula", () => {
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
    expect(estimateOneRepMax(100, 1)).toBe(103.3);
    expect(estimateOneRepMax(60, 10)).toBe(80);
  });

  it("rounds to one decimal", () => {
    expect(estimateOneRepMax(102.5, 3)).toBe(112.8);
  });

  it("refuses high-rep sets where the estimate is meaningless", () => {
    expect(estimateOneRepMax(20, 21)).toBeNull();
    expect(estimateOneRepMax(20, 50)).toBeNull();
  });

  it("rejects non-positive input", () => {
    expect(estimateOneRepMax(0, 5)).toBeNull();
    expect(estimateOneRepMax(-10, 5)).toBeNull();
    expect(estimateOneRepMax(100, 0)).toBeNull();
  });
});

describe("supportsReps", () => {
  it("only applies to weighted units", () => {
    expect(supportsReps("KG")).toBe(true);
    expect(supportsReps("LB")).toBe(true);
    expect(supportsReps("REPS")).toBe(false);
    expect(supportsReps("SECONDS")).toBe(false);
    expect(supportsReps("CM")).toBe(false);
  });
});

describe("daysSince", () => {
  it("counts whole days in the past", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(daysSince(fiveDaysAgo)).toBe(5);
  });

  it("returns 0 for today", () => {
    expect(daysSince(new Date())).toBe(0);
  });
});

describe("formatRelativeDays", () => {
  const ago = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  it("names the recent past", () => {
    expect(formatRelativeDays(new Date())).toBe("today");
    expect(formatRelativeDays(ago(1))).toBe("yesterday");
    expect(formatRelativeDays(ago(6))).toBe("6 days ago");
  });

  it("rolls up to weeks, months and years", () => {
    expect(formatRelativeDays(ago(21))).toBe("3 weeks ago");
    expect(formatRelativeDays(ago(95))).toBe("3 months ago");
    expect(formatRelativeDays(ago(400))).toBe("1 years ago");
  });
});

describe("targetProgress", () => {
  it("tracks progress upward toward a higher target", () => {
    const progress = targetProgress(45, 50, 40);
    expect(progress.remaining).toBe(5);
    expect(progress.percent).toBe(50);
    expect(progress.achieved).toBe(false);
  });

  it("tracks progress downward toward a faster target", () => {
    const progress = targetProgress(24, 22, 26);
    expect(progress.remaining).toBe(2);
    expect(progress.percent).toBe(50);
    expect(progress.achieved).toBe(false);
  });

  it("reports completion and overshoot", () => {
    const reached = targetProgress(50, 50, 40);
    expect(reached.achieved).toBe(true);
    expect(reached.percent).toBe(100);

    const exceeded = targetProgress(55, 50, 40);
    expect(exceeded.achieved).toBe(true);
    expect(exceeded.percent).toBe(100);
    expect(exceeded.remaining).toBeLessThan(0);
  });

  it("still resolves a direction without a known starting point", () => {
    expect(targetProgress(45, 50).remaining).toBe(5);
    expect(targetProgress(55, 50).remaining).toBe(5);
  });
});

describe("formatValue", () => {
  it("appends the unit label", () => {
    expect(formatValue(12, "REPS")).toBe("12 reps");
    expect(formatValue(25.4, "MINUTES")).toBe("25.4 min");
  });

  it("rounds long decimals to two places", () => {
    expect(formatValue(12.345, "KG")).toBe("12.35 kg");
  });
});

describe("personalBestInputSchema", () => {
  const valid = {
    type: "EXERCISE",
    name: "Max Push-ups",
    value: 40,
    unit: "REPS",
    date: "2026-04-01",
  };

  it("accepts a valid payload", () => {
    expect(personalBestInputSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts reps, a target value and a target date", () => {
    const result = personalBestInputSchema.safeParse({
      ...valid,
      unit: "KG",
      reps: "5",
      targetValue: "120",
      targetDate: "2026-12-01",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reps).toBe(5);
      expect(result.data.targetValue).toBe(120);
      expect(result.data.targetDate).toBeInstanceOf(Date);
    }
  });

  it("rejects nonsense reps", () => {
    expect(personalBestInputSchema.safeParse({ ...valid, reps: 0 }).success).toBe(
      false,
    );
    expect(personalBestInputSchema.safeParse({ ...valid, reps: 2.5 }).success).toBe(
      false,
    );
  });

  it("accepts an explicit direction so holds can beat run-style defaults", () => {
    const result = personalBestInputSchema.safeParse({
      ...valid,
      name: "Plank Hold",
      unit: "SECONDS",
      direction: "HIGHER",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.direction).toBe("HIGHER");
  });

  it("treats direction as optional", () => {
    const result = personalBestInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.direction).toBeUndefined();
  });

  it("rejects an unknown direction", () => {
    expect(
      personalBestInputSchema.safeParse({ ...valid, direction: "FASTER" }).success,
    ).toBe(false);
  });

  it("coerces a numeric string value", () => {
    const result = personalBestInputSchema.safeParse({ ...valid, value: "42.5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.value).toBe(42.5);
  });

  it("coerces the date into a Date", () => {
    const result = personalBestInputSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.date).toBeInstanceOf(Date);
  });

  it("trims the name and rejects blank names", () => {
    const trimmed = personalBestInputSchema.safeParse({ ...valid, name: "  Squat  " });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.name).toBe("Squat");

    expect(personalBestInputSchema.safeParse({ ...valid, name: "   " }).success).toBe(
      false,
    );
  });

  it("rejects an unknown unit", () => {
    expect(
      personalBestInputSchema.safeParse({ ...valid, unit: "STONES" }).success,
    ).toBe(false);
  });

  it("rejects a non-numeric value", () => {
    expect(
      personalBestInputSchema.safeParse({ ...valid, value: "heavy" }).success,
    ).toBe(false);
  });

  it("rejects an unknown category", () => {
    expect(
      personalBestInputSchema.safeParse({ ...valid, type: "CARDIO" }).success,
    ).toBe(false);
  });

  it("accepts every supported unit", () => {
    for (const unit of PERSONAL_BEST_UNITS) {
      expect(personalBestInputSchema.safeParse({ ...valid, unit }).success).toBe(
        true,
      );
    }
  });
});

describe("attemptInputSchema", () => {
  it("accepts a minimal entry", () => {
    expect(
      attemptInputSchema.safeParse({ value: 11, date: "2026-05-02" }).success,
    ).toBe(true);
  });

  it("accepts reps for a weighted entry", () => {
    const result = attemptInputSchema.safeParse({
      value: 100,
      reps: 5,
      date: "2026-05-02",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reps).toBe(5);
  });

  it("requires a value and a date", () => {
    expect(attemptInputSchema.safeParse({ date: "2026-05-02" }).success).toBe(false);
    expect(attemptInputSchema.safeParse({ value: 11 }).success).toBe(false);
  });
});

describe("updatePersonalBestSchema", () => {
  it("accepts an empty patch", () => {
    expect(updatePersonalBestSchema.safeParse({}).success).toBe(true);
  });

  it("accepts flipping the scoring", () => {
    const result = updatePersonalBestSchema.safeParse({ direction: "HIGHER" });
    expect(result.success).toBe(true);
  });

  it("accepts clearing notes with null", () => {
    const result = updatePersonalBestSchema.safeParse({ notes: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.notes).toBeNull();
  });

  it("accepts setting and clearing a target", () => {
    const set = updatePersonalBestSchema.safeParse({ targetValue: 50 });
    expect(set.success).toBe(true);
    if (set.success) expect(set.data.targetValue).toBe(50);

    const cleared = updatePersonalBestSchema.safeParse({
      targetValue: null,
      targetDate: null,
    });
    expect(cleared.success).toBe(true);
    if (cleared.success) {
      expect(cleared.data.targetValue).toBeNull();
      expect(cleared.data.targetDate).toBeNull();
    }
  });

  it("rejects an empty name", () => {
    expect(updatePersonalBestSchema.safeParse({ name: "  " }).success).toBe(false);
  });

  it("rejects an unknown unit", () => {
    expect(updatePersonalBestSchema.safeParse({ unit: "STONES" }).success).toBe(
      false,
    );
  });
});
