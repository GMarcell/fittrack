import { z } from "zod";

/**
 * Domain logic for personal bests.
 *
 * This module is deliberately free of `@prisma/client` imports so that both
 * server code and client components can share the same units, presets and
 * validation rules. The string unions below mirror the Prisma enums.
 */

export const PERSONAL_BEST_TYPES = ["EXERCISE", "BODY_METRIC"] as const;
export type PersonalBestTypeValue = (typeof PERSONAL_BEST_TYPES)[number];

export const PERSONAL_BEST_UNITS = [
  "REPS",
  "SECONDS",
  "MINUTES",
  "METERS",
  "KM",
  "KG",
  "LB",
  "COUNT",
  "CM",
  "MM",
  "PERCENT",
] as const;
export type PersonalBestUnitValue = (typeof PERSONAL_BEST_UNITS)[number];

/**
 * How a new entry compares to the stored best.
 *
 * - `HIGHER`: more is better (reps, weight lifted, plank hold in seconds)
 * - `LOWER`: less is better (sprint and run times)
 * - `LATEST`: no notion of "better" — the newest measurement is the current one
 *
 * A unit alone cannot decide this: a 5km time and a plank hold are both
 * measured in seconds/minutes but only the run is "lower is better". The
 * direction is therefore chosen per record (from its preset, or by the user)
 * and stored alongside it.
 */
export const DIRECTIONS = ["HIGHER", "LOWER", "LATEST"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const DIRECTION_LABELS: Record<Direction, string> = {
  HIGHER: "Higher is better",
  LOWER: "Lower is better",
  LATEST: "Latest entry is the current value",
};

export const SCORING_OPTIONS: { value: Direction; label: string }[] = [
  { value: "HIGHER", label: "Higher is better" },
  { value: "LOWER", label: "Lower is better" },
];

export const TYPE_LABELS: Record<PersonalBestTypeValue, string> = {
  EXERCISE: "Exercise PR",
  BODY_METRIC: "Body metric",
};

export const UNIT_LABELS: Record<PersonalBestUnitValue, string> = {
  REPS: "reps",
  SECONDS: "sec",
  MINUTES: "min",
  METERS: "m",
  KM: "km",
  KG: "kg",
  LB: "lb",
  COUNT: "count",
  CM: "cm",
  MM: "mm",
  PERCENT: "%",
};

export const EXERCISE_UNITS: PersonalBestUnitValue[] = [
  "REPS",
  "SECONDS",
  "MINUTES",
  "METERS",
  "KM",
  "KG",
  "LB",
  "COUNT",
];

export const BODY_METRIC_UNITS: PersonalBestUnitValue[] = [
  "KG",
  "LB",
  "CM",
  "MM",
  "PERCENT",
];

export type Preset = {
  name: string;
  unit: PersonalBestUnitValue;
  direction: Direction;
};

export const CUSTOM_PRESET_NAME = "Custom…";

/** Exercise presets, with the scoring that makes sense for each record. */
export const EXERCISE_PRESETS: Preset[] = [
  { name: "Max Push-ups", unit: "REPS", direction: "HIGHER" },
  { name: "Max Pull-ups", unit: "REPS", direction: "HIGHER" },
  { name: "Max Squats", unit: "REPS", direction: "HIGHER" },
  { name: "Max Dips", unit: "REPS", direction: "HIGHER" },
  { name: "Plank Hold", unit: "SECONDS", direction: "HIGHER" },
  { name: "Wall Sit", unit: "SECONDS", direction: "HIGHER" },
  { name: "Dead Hang", unit: "SECONDS", direction: "HIGHER" },
  { name: "40m Sprint", unit: "SECONDS", direction: "LOWER" },
  { name: "1km Run", unit: "MINUTES", direction: "LOWER" },
  { name: "5km Run", unit: "MINUTES", direction: "LOWER" },
  { name: "Deadlift", unit: "KG", direction: "HIGHER" },
  { name: "Back Squat", unit: "KG", direction: "HIGHER" },
  { name: "Bench Press", unit: "KG", direction: "HIGHER" },
  { name: "Standing Long Jump", unit: "CM", direction: "HIGHER" },
  { name: CUSTOM_PRESET_NAME, unit: "REPS", direction: "HIGHER" },
];

export const BODY_METRIC_PRESETS: Preset[] = [
  { name: "Bodyweight", unit: "KG", direction: "LATEST" },
  { name: "Body Fat %", unit: "PERCENT", direction: "LATEST" },
  { name: "Waist", unit: "CM", direction: "LATEST" },
  { name: "Chest", unit: "CM", direction: "LATEST" },
  { name: "Arm", unit: "CM", direction: "LATEST" },
  { name: CUSTOM_PRESET_NAME, unit: "KG", direction: "LATEST" },
];

export function presetsFor(type: PersonalBestTypeValue): Preset[] {
  return type === "BODY_METRIC" ? BODY_METRIC_PRESETS : EXERCISE_PRESETS;
}

export function unitsFor(type: PersonalBestTypeValue): PersonalBestUnitValue[] {
  return type === "BODY_METRIC" ? BODY_METRIC_UNITS : EXERCISE_UNITS;
}

/** Fallback scoring when a record has no preset (custom names). */
export function defaultDirection(
  type: PersonalBestTypeValue,
  unit: PersonalBestUnitValue,
): Direction {
  if (type === "BODY_METRIC") return "LATEST";
  if (unit === "SECONDS" || unit === "MINUTES") return "LOWER";
  return "HIGHER";
}

/** Whether `next` beats `current` under the given scoring. */
export function isBetterValue(
  next: number,
  current: number,
  direction: Direction,
): boolean {
  if (direction === "LATEST") return true;
  if (direction === "LOWER") return next < current;
  return next > current;
}

export type BestValue = { value: number; date: Date };

/**
 * Reduces a list of attempts into the current best value.
 * `LATEST` records keep the most recent entry.
 */
export function computeBest(
  attempts: { value: number; date: Date | string }[],
  direction: Direction,
): BestValue | null {
  if (attempts.length === 0) return null;

  const sorted = [...attempts].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  if (direction === "LATEST") {
    const last = sorted[sorted.length - 1];
    return { value: last.value, date: new Date(last.date) };
  }

  let best: BestValue | null = null;
  for (const attempt of sorted) {
    const date = new Date(attempt.date);
    if (!best || isBetterValue(attempt.value, best.value, direction)) {
      best = { value: attempt.value, date };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Estimated one-rep max
// ---------------------------------------------------------------------------

/** Units where an entry is a weight and reps can be recorded alongside it. */
export function supportsReps(unit: PersonalBestUnitValue): boolean {
  return unit === "KG" || unit === "LB";
}

/**
 * Epley's formula stops being meaningful for high-rep sets, so estimates are
 * only produced for sets of 20 reps or fewer.
 */
export const MAX_REPS_FOR_ESTIMATE = 20;

export function estimateOneRepMax(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || !Number.isFinite(reps)) return null;
  if (reps < 1 || reps > MAX_REPS_FOR_ESTIMATE) return null;
  if (weight <= 0) return null;

  const estimate = weight * (1 + reps / 30);
  return Math.round(estimate * 10) / 10;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Whole days between `date` and now (negative = in the future). */
export function daysSince(date: Date | string): number {
  const then = new Date(date).getTime();
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

/** "today", "yesterday", "5 days ago", "3 weeks ago", "2 months ago". */
export function formatRelativeDays(date: Date | string): string {
  const days = daysSince(date);

  if (days < 0) return "scheduled";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export type TargetProgress = {
  /// Signed: positive means still to go, negative means overshot the target.
  remaining: number;
  /// 0–100, how much of the journey from `start` to the target is done.
  percent: number;
  achieved: boolean;
};

/**
 * Progress toward a target, in whichever direction the target sits.
 *
 * `start` is the value when the target was set; when it is unknown the current
 * value is assumed to still be approaching the target.
 */
export function targetProgress(
  current: number,
  target: number,
  start?: number,
): TargetProgress {
  const goingUp = start === undefined ? current <= target : start <= target;
  const remaining = goingUp ? target - current : current - target;
  const achieved = remaining <= 0;

  const from = start ?? current;
  const span = Math.abs(target - from);
  const travelled = goingUp ? current - from : from - current;
  const percent =
    span === 0
      ? achieved
        ? 100
        : 0
      : Math.max(0, Math.min(100, Math.round((travelled / span) * 100)));

  return {
    remaining: Math.round(remaining * 100) / 100,
    percent: achieved ? 100 : percent,
    achieved,
  };
}

/** Formats a value with its unit, e.g. `12.5 kg`. */
export function formatValue(value: number, unit: PersonalBestUnitValue): string {
  const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  return `${rounded} ${UNIT_LABELS[unit]}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function toDateInputValue(date: Date | string): string {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const repsSchema = z.coerce
  .number()
  .int()
  .min(1, "Reps must be at least 1")
  .max(100, "Reps look too high")
  .optional();

export const personalBestInputSchema = z.object({
  type: z.enum(PERSONAL_BEST_TYPES),
  name: z.string().trim().min(1, "Name is required").max(120),
  value: z.coerce.number().finite("Value must be a number"),
  unit: z.enum(PERSONAL_BEST_UNITS),
  date: z.coerce.date(),
  /// Omit to inherit the preset/default scoring for the unit.
  direction: z.enum(DIRECTIONS).optional(),
  reps: repsSchema,
  targetValue: z.coerce.number().finite().optional(),
  targetDate: z.coerce.date().optional(),
  notes: z.string().trim().max(2000).optional(),
  verified: z.boolean().optional(),
});

export type PersonalBestInput = z.infer<typeof personalBestInputSchema>;

export const attemptInputSchema = z.object({
  value: z.coerce.number().finite("Value must be a number"),
  date: z.coerce.date(),
  reps: repsSchema,
  notes: z.string().trim().max(2000).optional(),
});

export type AttemptInput = z.infer<typeof attemptInputSchema>;

export const updatePersonalBestSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  unit: z.enum(PERSONAL_BEST_UNITS).optional(),
  direction: z.enum(DIRECTIONS).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  verified: z.boolean().optional(),
  /// `null` clears the target.
  targetValue: z.coerce.number().finite().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
});

export type UpdatePersonalBestInput = z.infer<typeof updatePersonalBestSchema>;
