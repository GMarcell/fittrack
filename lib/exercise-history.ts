/**
 * Exercise-level progress built from logged sessions (not from personal-best
 * records). Every completed session contributes one point per exercise — the
 * top set that day — so the chart tracks what was actually lifted.
 */

export type LoggedSet = { weight: number | null; reps: number };

export type LoggedExercise = {
  name: string;
  /** "KG" | "LB" for loaded work, null for bodyweight/timed work. */
  unit: string | null;
  date: Date;
  sets: LoggedSet[];
};

export type ExercisePoint = {
  date: Date;
  value: number;
};

export type ExerciseProgress = {
  name: string;
  unit: string | null;
  sessions: number;
  lastDate: Date;
  bestValue: number;
  bestDate: Date;
  points: ExercisePoint[];
};

/**
 * The set that represents the day: heaviest loaded set when any weight was
 * used, otherwise the highest rep count.
 */
export function topSetValue(sets: LoggedSet[]): number | null {
  if (sets.length === 0) return null;

  const weighted = sets.filter(
    (set) => set.weight !== null && Number.isFinite(set.weight) && set.weight > 0,
  );
  if (weighted.length > 0) {
    return Math.max(...weighted.map((set) => set.weight as number));
  }

  return Math.max(...sets.map((set) => set.reps));
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Groups logged exercises by name and builds an ascending top-set series. */
export function collectExerciseProgress(entries: LoggedExercise[]): ExerciseProgress[] {
  const byName = new Map<
    string,
    {
      name: string;
      unit: string | null;
      lastDate: Date;
      points: Map<string, ExercisePoint>;
    }
  >();

  for (const entry of entries) {
    const value = topSetValue(entry.sets);
    if (value === null) continue;

    const key = entry.name.trim().toLowerCase();
    if (!key) continue;

    const existing = byName.get(key);
    const date = new Date(entry.date);
    const pointKey = dayKey(date);

    if (!existing) {
      byName.set(key, {
        name: entry.name.trim(),
        unit: entry.unit,
        lastDate: date,
        points: new Map([[pointKey, { date, value }]]),
      });
      continue;
    }

    // Same exercise logged twice in a day: the better top set is the data point.
    const previous = existing.points.get(pointKey);
    if (!previous || value > previous.value) {
      existing.points.set(pointKey, { date, value });
    }

    // Keep the name/unit from the most recent time it was trained.
    if (date.getTime() >= existing.lastDate.getTime()) {
      existing.lastDate = date;
      existing.name = entry.name.trim();
      existing.unit = entry.unit ?? existing.unit;
    }
  }

  return [...byName.values()]
    .map((entry) => {
      const points = [...entry.points.values()].sort(
        (a, b) => a.date.getTime() - b.date.getTime(),
      );
      const best = points.reduce((a, b) => (b.value > a.value ? b : a));
      return {
        name: entry.name,
        unit: entry.unit,
        sessions: points.length,
        lastDate: entry.lastDate,
        bestValue: best.value,
        bestDate: best.date,
        points,
      };
    })
    .sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime());
}
