import type { Prisma } from "@prisma/client";
import {
  computeBest,
  estimateOneRepMax,
  isBetterValue,
  supportsReps,
  type Direction,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";

type Tx = Prisma.TransactionClient;

/**
 * Recalculates `bestValue` / `achievedAt` from the attempt history and flags the
 * attempt that currently holds the record. Used after edits, scoring changes
 * and deletions so the stored record can never drift from its history.
 *
 * Achievements are intentionally left alone: they record what happened at the
 * time and are not rewritten by later edits.
 */
export async function recomputeBest(tx: Tx, personalBestId: string) {
  const record = await tx.personalBest.findUnique({
    where: { id: personalBestId },
    include: { attempts: { orderBy: { date: "asc" } } },
  });

  if (!record) return null;

  const best = computeBest(record.attempts, record.direction as Direction);

  if (!best) {
    return record;
  }

  await tx.attempt.updateMany({
    where: { personalBestId },
    data: { isBest: false },
  });

  await tx.attempt.updateMany({
    where: { personalBestId, value: best.value, date: best.date },
    data: { isBest: true },
  });

  return tx.personalBest.update({
    where: { id: personalBestId },
    data: { bestValue: best.value, achievedAt: best.date },
  });
}

/**
 * Applies a newly logged value to a record, updating the stored best when the
 * new value wins under the record's scoring.
 */
export function beatsCurrentBest(
  direction: Direction,
  value: number,
  currentBest: number,
): boolean {
  return isBetterValue(value, currentBest, direction);
}

/** Epley estimate for an entry, when the record is weighted and reps were given. */
export function deriveEstimatedOneRep(
  unit: PersonalBestUnitValue,
  value: number,
  reps?: number | null,
): number | null {
  if (!reps || !supportsReps(unit)) return null;
  return estimateOneRepMax(value, reps);
}

export type EntryInput = {
  value: number;
  date: Date;
  notes?: string | null;
  reps?: number | null;
  /// True when this entry establishes a brand-new record (no prior history).
  isFirstEntry?: boolean;
};

export type LogEntryResult = {
  isPersonalBest: boolean;
  attemptId: string;
  previousValue: number | null;
};

/**
 * Logs one entry against a record: appends to the history, promotes the record
 * when the entry wins, and records an achievement when a record is broken.
 *
 * Body metrics (`LATEST`) never produce achievements — every measurement would
 * otherwise count as a "personal best".
 */
export async function logEntry(
  tx: Tx,
  record: {
    id: string;
    userId: string;
    unit: PersonalBestUnitValue;
    direction: Direction;
    bestValue: number;
    attempts?: unknown;
  },
  entry: EntryInput,
): Promise<LogEntryResult> {
  const direction = record.direction;
  // The first entry of a record *is* the record, whatever the scoring says
  // (a new LOWER-is-better record must not be beaten by its own 0 baseline).
  const isNewRecord = entry.isFirstEntry
    ? true
    : isBetterValue(entry.value, record.bestValue, direction);
  const isPersonalBest = isNewRecord && direction !== "LATEST";

  const attempt = await tx.attempt.create({
    data: {
      userId: record.userId,
      personalBestId: record.id,
      value: entry.value,
      date: entry.date,
      notes: entry.notes ?? null,
      reps: entry.reps ?? null,
      estimatedOneRep: deriveEstimatedOneRep(record.unit, entry.value, entry.reps),
      isBest: isNewRecord,
    },
  });

  // The new entry won, so the previous holder is no longer the current best.
  if (isNewRecord) {
    await tx.attempt.updateMany({
      where: { personalBestId: record.id, id: { not: attempt.id } },
      data: { isBest: false },
    });

    await tx.personalBest.update({
      where: { id: record.id },
      data: { bestValue: entry.value, achievedAt: entry.date },
    });
  }

  if (isPersonalBest) {
    await tx.achievement.create({
      data: {
        userId: record.userId,
        personalBestId: record.id,
        value: entry.value,
        // Null for the entry that first established the record.
        previousValue: entry.isFirstEntry ? null : record.bestValue,
        date: entry.date,
      },
    });
  }

  return {
    isPersonalBest,
    attemptId: attempt.id,
    previousValue:
      isPersonalBest && !entry.isFirstEntry ? record.bestValue : null,
  };
}
