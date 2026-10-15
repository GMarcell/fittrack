import { z } from "zod";
import { classifyExercise, type MuscleGroup } from "@/lib/muscle-groups";

/**
 * Domain logic for executing training sessions: parsing the generated plan
 * into a concrete day, validating logging input, and deriving analytics.
 */

// ---------------------------------------------------------------------------
// Plan shape (mirrors PLAN_JSON_SCHEMA in the plan generation route)
// ---------------------------------------------------------------------------

export type PlanExercise = {
  exercise: string;
  sets: number;
  reps: string;
  rpe?: string | null;
  notes?: string | null;
  muscleGroup?: string | null;
};

export type PlanDay = {
  day: string;
  sessionType: string;
  warmUp?: string[] | null;
  mainWorkout: PlanExercise[];
  cooldown?: string[] | null;
};

export type WeekPlan = {
  goal?: string;
  experience?: string;
  equipment?: string;
  weeklySchedule: PlanDay[];
  notes?: string;
};

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function parsePlan(planJson: string): WeekPlan | null {
  try {
    const plan = JSON.parse(planJson) as WeekPlan;
    if (!Array.isArray(plan.weeklySchedule)) return null;
    return plan;
  } catch {
    return null;
  }
}

/** Weekday name in the user's timezone (User.timezone, e.g. "Asia/Jakarta"). */
export function weekdayInTimezone(date: Date, timezone: string): string {
  try {
    const name = date.toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: timezone,
    });
    return name;
  } catch {
    return DAY_NAMES[date.getUTCDay()];
  }
}

/** Calendar-day key "YYYY-MM-DD" in the user's timezone. */
export function dateKeyInTimezone(date: Date, timezone: string): string {
  try {
    return date.toLocaleDateString("en-CA", { timeZone: timezone });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/**
 * The planned day for `date`, tolerating loose naming in AI output
 * ("Monday", "mon", "Rest day", "Day 1"…). Null when nothing matches.
 */
export function findPlannedDay(plan: WeekPlan, dayName: string): PlanDay | null {
  const lower = dayName.toLowerCase();
  for (const day of plan.weeklySchedule) {
    const d = day.day.toLowerCase();
    if (d === lower) return day;
    if (d.startsWith(lower.slice(0, 3))) return day;
    if (lower.startsWith(d.slice(0, 3))) return day;
  }
  return null;
}

export function isRestDay(day: PlanDay): boolean {
  const text = `${day.day} ${day.sessionType}`.toLowerCase();
  return text.includes("rest") || text.includes("recovery") || day.mainWorkout.length === 0;
}

/** Convert a plan day into the exercises a session should start with. */
export function exercisesFromPlanDay(day: PlanDay): PlanExercise[] {
  return day.mainWorkout.map((ex) => ({
    ...ex,
    muscleGroup: ex.muscleGroup ?? classifyExercise(ex.exercise),
  }));
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const WEIGHT_UNITS = ["KG", "LB"] as const;
export type SessionExerciseUnit = (typeof WEIGHT_UNITS)[number];

export const sessionExerciseInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  muscleGroup: z.string().trim().max(40).optional().nullable(),
  unit: z.enum(WEIGHT_UNITS).optional().nullable(),
  targetSets: z.coerce.number().int().min(0).max(20).optional().nullable(),
  repTarget: z.string().trim().max(40).optional().nullable(),
  rpeTarget: z.string().trim().max(40).optional().nullable(),
});

export const createSessionSchema = z.object({
  date: z.coerce.date().optional(),
  planDay: z.string().trim().max(40).optional().nullable(),
  sessionType: z.string().trim().max(80).optional().nullable(),
  exercises: z.array(sessionExerciseInputSchema).max(20).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const setEntryInputSchema = z.object({
  exerciseId: z.string().min(1),
  weight: z.coerce.number().finite().min(0).max(1000).optional().nullable(),
  reps: z.coerce.number().int().min(0).max(500),
  rpe: z.coerce.number().min(1).max(10).optional().nullable(),
});

export const updateSessionSchema = z.object({
  notes: z.string().trim().max(2000).optional().nullable(),
  date: z.coerce.date().optional(),
  complete: z.boolean().optional(),
});

export const updateSessionExerciseSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  unit: z.enum(WEIGHT_UNITS).nullable().optional(),
  targetSets: z.coerce.number().int().min(0).max(20).nullable().optional(),
  repTarget: z.string().trim().max(40).nullable().optional(),
  rpeTarget: z.string().trim().max(40).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

export type SetLike = { weight: number | null; reps: number; rpe: number | null };

/** Workload of one set (weight × reps); bodyweight sets count as zero tonnage. */
export function setTonnage(set: SetLike): number {
  if (!set.weight || set.weight <= 0) return 0;
  return set.weight * set.reps;
}

export function sessionTonnage(exercises: { sets: SetLike[] }[]): number {
  return exercises.reduce(
    (total, ex) => total + ex.sets.reduce((t, s) => t + setTonnage(s), 0),
    0,
  );
}

/** Working set = a set with reps above a warm-up-ish effort; counts for coverage. */
export function isWorkingSet(set: SetLike): boolean {
  return set.reps >= 1;
}

export type MuscleCoverage = Array<{
  group: MuscleGroup;
  sets: number;
  tonnage: number;
}>;

/** Sets and tonnage per muscle group over a set of logged exercises. */
export function muscleCoverage(
  exercises: { name: string; muscleGroup?: string | null; sets: SetLike[] }[],
): MuscleCoverage {
  const byGroup = new Map<MuscleGroup, { sets: number; tonnage: number }>();
  for (const ex of exercises) {
    const group =
      (ex.muscleGroup as MuscleGroup | null) ??
      (classifyExercise(ex.name) as MuscleGroup | null);
    if (!group) continue;
    const entry = byGroup.get(group) ?? { sets: 0, tonnage: 0 };
    for (const set of ex.sets) {
      if (!isWorkingSet(set)) continue;
      entry.sets += 1;
      entry.tonnage += setTonnage(set);
    }
    byGroup.set(group, entry);
  }
  return [...byGroup.entries()]
    .map(([group, v]) => ({ group, ...v }))
    .sort((a, b) => b.sets - a.sets);
}

/** ISO-ish week key (Monday-start) for grouping sessions by week. */
export function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Progressive overload suggestion
// ---------------------------------------------------------------------------

export type LastPerformance = {
  weight: number | null;
  reps: number;
  rpe: number | null;
  date: Date;
};

/**
 * Next-step target derived from the last session of an exercise.
 *
 * Simple linear rules a coach would recognise: when the last set hit the top
 * of the rep range with RPE ≤ 8, ask for a small load increase; otherwise
 * repeat last time's work.
 */
export function suggestNextStep(
  last: LastPerformance,
  repTarget?: string | null,
): { weight: number | null; reps: string; note: string } {
  const topOfRange = topRepFromTarget(repTarget);

  if (last.weight && last.weight > 0) {
    const rampedUp =
      topOfRange !== null && last.reps >= topOfRange && (last.rpe === null || last.rpe <= 8);
    if (rampedUp) {
      const step = last.weight >= 60 ? 2.5 : 1.25;
      return {
        weight: Math.round((last.weight + step) * 100) / 100,
        reps: repTarget ?? `${last.reps}`,
        note: `Beat last time's ${last.weight} × ${last.reps} — add ${step}`,
      };
    }
    return {
      weight: last.weight,
      reps: repTarget ?? `${last.reps}`,
      note: `Last time: ${last.weight} × ${last.reps}${last.rpe ? ` @RPE ${last.rpe}` : ""}`,
    };
  }

  return {
    weight: null,
    reps: repTarget ?? `${last.reps}`,
    note: `Last time: ${last.reps} reps${last.rpe ? ` @RPE ${last.rpe}` : ""}`,
  };
}

/** "3–5" / "8-12" / "10" → the top number of the range, if findable. */
export function topRepFromTarget(repTarget?: string | null): number | null {
  if (!repTarget) return null;
  const nums = repTarget.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  return Math.max(...nums.map(Number));
}
