import { describe, it, expect } from "vitest";
import {
  collectExerciseProgress,
  topSetValue,
  type LoggedExercise,
} from "@/lib/exercise-history";

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

const entry = (
  name: string,
  date: string,
  sets: { weight: number | null; reps: number }[],
  unit: string | null = "KG",
): LoggedExercise => ({ name, date: at(date), unit, sets });

describe("topSetValue", () => {
  it("uses the heaviest weighted set", () => {
    expect(
      topSetValue([
        { weight: 60, reps: 5 },
        { weight: 80, reps: 3 },
        { weight: 70, reps: 8 },
      ]),
    ).toBe(80);
  });

  it("falls back to the most reps for bodyweight work", () => {
    expect(
      topSetValue([
        { weight: null, reps: 12 },
        { weight: null, reps: 18 },
      ]),
    ).toBe(18);
  });

  it("ignores zero weights when reps are all that matter", () => {
    expect(
      topSetValue([
        { weight: 0, reps: 20 },
        { weight: null, reps: 15 },
      ]),
    ).toBe(20);
  });

  it("returns null for an exercise with no sets", () => {
    expect(topSetValue([])).toBeNull();
  });
});

describe("collectExerciseProgress", () => {
  it("groups names case-insensitively and keeps points in date order", () => {
    const progress = collectExerciseProgress([
      entry("Bench Press", "2026-10-12", [{ weight: 80, reps: 5 }]),
      entry("bench press", "2026-10-05", [{ weight: 75, reps: 5 }]),
      entry("BENCH PRESS", "2026-10-19", [{ weight: 85, reps: 3 }]),
    ]);

    expect(progress).toHaveLength(1);
    expect(progress[0].name).toBe("BENCH PRESS");
    expect(progress[0].sessions).toBe(3);
    expect(progress[0].points.map((p) => p.value)).toEqual([75, 80, 85]);
    expect(progress[0].bestValue).toBe(85);
  });

  it("keeps only the better top set when trained twice in one day", () => {
    const progress = collectExerciseProgress([
      entry("Squat", "2026-10-12", [{ weight: 100, reps: 5 }]),
      entry("Squat", "2026-10-12", [{ weight: 105, reps: 3 }]),
    ]);

    expect(progress[0].points).toHaveLength(1);
    expect(progress[0].points[0].value).toBe(105);
  });

  it("uses reps for bodyweight exercises and remembers the unit", () => {
    const progress = collectExerciseProgress([
      entry("Push-up", "2026-10-12", [{ weight: null, reps: 30 }], null),
    ]);

    expect(progress[0]).toMatchObject({ unit: null, bestValue: 30, sessions: 1 });
  });

  it("sorts exercises by most recently trained", () => {
    const progress = collectExerciseProgress([
      entry("Row", "2026-10-01", [{ weight: 60, reps: 8 }]),
      entry("Press", "2026-10-15", [{ weight: 40, reps: 8 }]),
    ]);

    expect(progress.map((p) => p.name)).toEqual(["Press", "Row"]);
  });

  it("skips entries with no usable sets", () => {
    expect(collectExerciseProgress([entry("Shrug", "2026-10-12", [])])).toEqual([]);
  });
});
