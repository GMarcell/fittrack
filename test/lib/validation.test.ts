import { describe, it, expect } from "vitest";
import {
  createBenchmarkSchema,
  createExerciseSchema,
  createSessionSchema,
  createGoalSchema,
  updateGoalSchema,
  updateSessionSchema,
  sessionExerciseSchema,
  statBoostSchema,
} from "@/lib/validation";

describe("createBenchmarkSchema", () => {
  it("accepts valid benchmark data", () => {
    const result = createBenchmarkSchema.safeParse({
      metric: "Push-ups",
      value: 50,
      unit: "REPS",
    });
    expect(result.success).toBe(true);
  });

  it("accepts benchmark with date", () => {
    const result = createBenchmarkSchema.safeParse({
      metric: "5k Run",
      value: 22.5,
      unit: "MINUTES",
      date: "2025-01-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty metric", () => {
    const result = createBenchmarkSchema.safeParse({
      metric: "",
      value: 50,
      unit: "REPS",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid unit", () => {
    const result = createBenchmarkSchema.safeParse({
      metric: "Test",
      value: 10,
      unit: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric value", () => {
    const result = createBenchmarkSchema.safeParse({
      metric: "Test",
      value: "abc",
      unit: "REPS",
    });
    expect(result.success).toBe(false);
  });
});

describe("createExerciseSchema", () => {
  it("accepts valid exercise data", () => {
    const result = createExerciseSchema.safeParse({
      name: "Bench Press",
      category: "STRENGTH",
      unit: "KG",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createExerciseSchema.safeParse({
      name: "",
      category: "STRENGTH",
      unit: "KG",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = createExerciseSchema.safeParse({
      name: "Test",
      category: "INVALID",
      unit: "KG",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = createExerciseSchema.safeParse({
      name: "Test",
    });
    expect(result.success).toBe(false);
  });
});

describe("sessionExerciseSchema", () => {
  it("accepts minimal exercise entry", () => {
    const result = sessionExerciseSchema.safeParse({
      exerciseId: "ex-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts full exercise entry", () => {
    const result = sessionExerciseSchema.safeParse({
      exerciseId: "ex-1",
      sets: 3,
      reps: 10,
      value: 50,
      notes: "Felt strong",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative sets", () => {
    const result = sessionExerciseSchema.safeParse({
      exerciseId: "ex-1",
      sets: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero reps", () => {
    const result = sessionExerciseSchema.safeParse({
      exerciseId: "ex-1",
      reps: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("statBoostSchema", () => {
  it("accepts valid stat boost", () => {
    const result = statBoostSchema.safeParse({
      type: "STR",
      value: 2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects value > 3", () => {
    const result = statBoostSchema.safeParse({
      type: "STR",
      value: 5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects value < 1", () => {
    const result = statBoostSchema.safeParse({
      type: "STR",
      value: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid stat type", () => {
    const result = statBoostSchema.safeParse({
      type: "INVALID",
      value: 2,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid stat types", () => {
    const types = ["STR", "END", "AGI", "SPD", "PWR", "FLX", "VIT", "DSC"] as const;
    for (const type of types) {
      const result = statBoostSchema.safeParse({ type, value: 1 });
      expect(result.success).toBe(true);
    }
  });
});

describe("createSessionSchema", () => {
  it("accepts valid session with exercises", () => {
    const result = createSessionSchema.safeParse({
      date: "2025-01-15",
      activityTypeId: "at-1",
      focus: "Upper body",
      duration: 60,
      rpe: 7,
      sessionExercises: [
        { exerciseId: "ex-1", sets: 3, reps: 10 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts session with stat boosts", () => {
    const result = createSessionSchema.safeParse({
      date: "2025-01-15",
      activityTypeId: "at-1",
      statBoosts: [
        { type: "STR", value: 2 },
        { type: "END", value: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal valid session", () => {
    const result = createSessionSchema.safeParse({
      date: "2025-01-15",
      activityTypeId: "at-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects RPE > 10", () => {
    const result = createSessionSchema.safeParse({
      date: "2025-01-15",
      activityTypeId: "at-1",
      rpe: 11,
    });
    expect(result.success).toBe(false);
  });

  it("rejects RPE < 1", () => {
    const result = createSessionSchema.safeParse({
      date: "2025-01-15",
      activityTypeId: "at-1",
      rpe: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing date", () => {
    const result = createSessionSchema.safeParse({
      activityTypeId: "at-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("createGoalSchema", () => {
  it("accepts valid goal", () => {
    const result = createGoalSchema.safeParse({
      name: "Run 5k in 25 min",
    });
    expect(result.success).toBe(true);
  });

  it("accepts goal with all optional fields", () => {
    const result = createGoalSchema.safeParse({
      name: "Bench 100kg",
      priority: "PRIMARY",
      targetDate: "2025-06-01",
      notes: "Need to focus on form",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createGoalSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid priority", () => {
    const result = createGoalSchema.safeParse({
      name: "Test",
      priority: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateGoalSchema", () => {
  it("accepts partial goal update", () => {
    const result = updateGoalSchema.safeParse({
      name: "Updated name",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty update object", () => {
    const result = updateGoalSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("updateSessionSchema", () => {
  it("accepts partial session update", () => {
    const result = updateSessionSchema.safeParse({
      focus: "Updated focus",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty update object", () => {
    const result = updateSessionSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
