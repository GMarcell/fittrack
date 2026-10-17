import { describe, it, expect } from "vitest";
import { muscleBalance } from "@/lib/recap";
import { MUSCLE_GROUPS } from "@/lib/muscle-groups";

const exercise = (name: string, group: string, sets: number, weight: number | null = null) => ({
  name,
  muscleGroup: group,
  sets: Array.from({ length: sets }, () => ({ weight, reps: 8, rpe: null })),
});

describe("muscleBalance", () => {
  it("returns every muscle group, including untrained ones", () => {
    const { rows } = muscleBalance([exercise("Bench press", "chest", 6, 80)]);
    expect(rows.map((row) => row.group)).toEqual([...MUSCLE_GROUPS]);
    expect(rows.find((row) => row.group === "legs")?.sets).toBe(0);
  });

  it("flags missing strength groups but not missing cardio", () => {
    const { neglected } = muscleBalance([
      exercise("Bench press", "chest", 6, 80),
      exercise("Squat", "legs", 6, 100),
      exercise("Row", "back", 6, 60),
      exercise("Press", "shoulders", 6, 40),
      exercise("Curl", "arms", 6, 15),
      exercise("Plank", "core", 6),
    ]);

    expect(neglected).toEqual([]);
  });

  it("flags groups far below the biggest group", () => {
    const { rows, neglected } = muscleBalance([
      exercise("Squat", "legs", 12, 100),
      exercise("Bench press", "chest", 1, 80),
    ]);

    expect(neglected).toContain("chest");
    expect(neglected).toContain("back");
    expect(rows.find((row) => row.group === "legs")?.percentOfTop).toBe(100);
    expect(rows.find((row) => row.group === "chest")?.percentOfTop).toBe(8);
  });

  it("reports tonnage per group", () => {
    const { rows } = muscleBalance([
      { name: "Squat", muscleGroup: "legs", sets: [{ weight: 100, reps: 5, rpe: null }] },
    ]);
    expect(rows.find((row) => row.group === "legs")?.tonnage).toBe(500);
  });

  it("handles an empty week", () => {
    const { rows, neglected } = muscleBalance([]);
    expect(neglected).toEqual([]);
    expect(rows.every((row) => row.sets === 0 && !row.neglected)).toBe(true);
  });
});
