import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logEntry } from "@/lib/personal-best-service";
import {
  supportsReps,
  type Direction,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";
import { WEIGHT_UNITS, suggestNextStep } from "@/lib/session";
import type { RunnerExercise } from "@/components/session/session-runner";

type Tx = Prisma.TransactionClient;

export type SyncedExercise = {
  name: string;
  logged: boolean;
  isPersonalBest: boolean;
  previousValue: number | null;
};

type BestSet = {
  id: string;
  weight: number | null;
  reps: number;
};

/** The set worth promoting to a record: heaviest weighted, else longest. */
function pickBestSet(
  sets: { id: string; weight: number | null; reps: number; attemptId: string | null }[],
): { best: BestSet; hasWeight: boolean } | null {
  const fresh = sets.filter((s) => !s.attemptId);
  if (fresh.length === 0) return null;

  const weighted = fresh.filter((s) => s.weight && s.weight > 0);
  const pool = weighted.length > 0 ? weighted : fresh;
  const best = pool.reduce((a, b) =>
    b.reps > a.reps || (b.weight ?? 0) > (a.weight ?? 0) ? b : a,
  );
  return { best: { id: best.id, weight: best.weight, reps: best.reps }, hasWeight: weighted.length > 0 };
}

/**
 * Completes a session: for every exercise, promotes the best fresh set into a
 * matching personal-best record (by name), creating a weight record when none
 * exists. Bodyweight exercises only sync into records the user already tracks.
 */
export async function syncSessionToPersonalBests(
  tx: Tx,
  userId: string,
  sessionId: string,
): Promise<SyncedExercise[]> {
  const session = await tx.workoutSession.findUnique({
    where: { id: sessionId },
    include: { exercises: { include: { sets: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!session) throw new Error("Session not found");

  const results: SyncedExercise[] = [];

  for (const exercise of session.exercises) {
    const picked = pickBestSet(exercise.sets);
    if (!picked) {
      results.push({ name: exercise.name, logged: false, isPersonalBest: false, previousValue: null });
      continue;
    }
    const { best, hasWeight } = picked;

    const record = await tx.personalBest.findFirst({
      where: { userId, type: "EXERCISE", name: { equals: exercise.name, mode: "insensitive" } },
    });

    let target = record;
    if (!target) {
      // Only auto-create records for loaded work; the unit follows the session.
      if (!hasWeight || !exercise.unit || !WEIGHT_UNITS.includes(exercise.unit as (typeof WEIGHT_UNITS)[number])) {
        results.push({ name: exercise.name, logged: false, isPersonalBest: false, previousValue: null });
        continue;
      }
      const unit = exercise.unit as PersonalBestUnitValue;
      if (!supportsReps(unit)) {
        results.push({ name: exercise.name, logged: false, isPersonalBest: false, previousValue: null });
        continue;
      }
      try {
        target = await tx.personalBest.create({
          data: {
            userId,
            type: "EXERCISE",
            name: exercise.name,
            unit,
            direction: "HIGHER" as Direction,
            bestValue: best.weight ?? 0,
            achievedAt: session.date,
          },
        });
      } catch {
        target = await tx.personalBest.findFirst({
          where: { userId, type: "EXERCISE", name: exercise.name },
        });
        if (!target) {
          results.push({ name: exercise.name, logged: false, isPersonalBest: false, previousValue: null });
          continue;
        }
      }
    }

    const unit = target.unit as PersonalBestUnitValue;
    const isWeightRecord = supportsReps(unit);
    const isRepRecord = unit === "REPS" || unit === "COUNT";

    if (!(isWeightRecord ? hasWeight && best.weight : isRepRecord && !hasWeight)) {
      results.push({ name: exercise.name, logged: false, isPersonalBest: false, previousValue: null });
      continue;
    }

    const value = isWeightRecord ? (best.weight ?? 0) : best.reps;
    const loggedResult = await logEntry(
      tx,
      {
        id: target.id,
        userId,
        unit,
        direction: target.direction as Direction,
        bestValue: target.bestValue,
      },
      {
        value,
        date: session.date,
        reps: isWeightRecord ? best.reps : null,
        notes: `Auto-logged from session (${session.sessionType ?? "workout"})`,
        isFirstEntry: !record,
      },
    );

    await tx.setEntry.update({ where: { id: best.id }, data: { attemptId: loggedResult.attemptId } });

    results.push({
      name: exercise.name,
      logged: true,
      isPersonalBest: loggedResult.isPersonalBest,
      previousValue: loggedResult.previousValue,
    });
  }

  await tx.workoutSession.update({
    where: { id: sessionId },
    data: { completedAt: session.completedAt ?? new Date() },
  });

  return results;
}

type ExerciseWithSets = {
  id: string;
  name: string;
  muscleGroup: string | null;
  unit: string | null;
  targetSets: number | null;
  repTarget: string | null;
  rpeTarget: string | null;
  sets: Array<{
    id: string;
    setNumber: number;
    weight: number | null;
    reps: number;
    rpe: number | null;
  }>;
};

/**
 * Shapes a stored session into the props SessionRunner needs, including the
 * "last time" overload suggestion for every exercise. Shared by /today and
 * /sessions/[id] so resuming an old workout behaves identically.
 */
export async function runnerExercisesFor(
  userId: string,
  exercises: ExerciseWithSets[],
): Promise<RunnerExercise[]> {
  return Promise.all(
    exercises.map(async (ex) => {
      const last = await lastPerformanceFor(userId, ex.name);
      const suggestion = last
        ? suggestNextStep(
            { weight: last.weight, reps: last.reps, rpe: last.rpe, date: last.date },
            ex.repTarget,
          )
        : null;

      return {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        unit: ex.unit,
        targetSets: ex.targetSets,
        repTarget: ex.repTarget,
        rpeTarget: ex.rpeTarget,
        sets: ex.sets
          .slice()
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set) => ({
            id: set.id,
            setNumber: set.setNumber,
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
          })),
        suggestion: suggestion
          ? { weight: suggestion.weight, reps: suggestion.reps, note: suggestion.note }
          : null,
      };
    }),
  );
}

/**
 * The best recent set performed for an exercise name in completed sessions —
 * the basis for "last time you did X, target Y" overload suggestions.
 */
export async function lastPerformanceFor(
  userId: string,
  name: string,
): Promise<{ weight: number | null; reps: number; rpe: number | null; date: Date } | null> {
  const sets = await prisma.setEntry.findMany({
    where: {
      sessionExercise: {
        name: { equals: name, mode: "insensitive" },
        session: { userId, completedAt: { not: null } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  if (sets.length === 0) return null;

  const best = sets.reduce((a, b) => {
    const aw = a.weight ?? 0;
    const bw = b.weight ?? 0;
    return bw > aw || (bw === aw && b.reps > a.reps) ? b : a;
  });
  return { weight: best.weight, reps: best.reps, rpe: best.rpe, date: best.createdAt };
}
