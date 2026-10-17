import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscle-groups";
import { muscleCoverage, type SetLike } from "@/lib/session";

export type MuscleBalanceRow = {
  group: MuscleGroup;
  sets: number;
  tonnage: number;
  /** Share of the best-covered group's working sets, 0–100. */
  percentOfTop: number;
  neglected: boolean;
};

/** Groups that should appear in a balanced week; cardio is often intentional. */
const STRENGTH_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "core",
];

/**
 * Working sets per muscle group over a window, with groups that are absent or
 * far below the week's biggest group flagged as neglected.
 */
export function muscleBalance(
  exercises: { name: string; muscleGroup?: string | null; sets: SetLike[] }[],
): { rows: MuscleBalanceRow[]; neglected: MuscleGroup[] } {
  const coverage = muscleCoverage(exercises);
  const byGroup = new Map(coverage.map((entry) => [entry.group, entry]));
  const maxSets = Math.max(0, ...coverage.map((entry) => entry.sets));

  // Zero is always a problem once anything was trained; otherwise allow a
  // quarter of the best-covered group before calling it neglected.
  const threshold = Math.max(1, Math.ceil(maxSets * 0.25));

  const rows: MuscleBalanceRow[] = MUSCLE_GROUPS.map((group) => {
    const entry = byGroup.get(group) ?? { sets: 0, tonnage: 0 };
    return {
      group,
      sets: entry.sets,
      tonnage: entry.tonnage,
      percentOfTop: maxSets === 0 ? 0 : Math.round((entry.sets / maxSets) * 100),
      neglected: false,
    };
  }).map((row) => ({
    ...row,
    neglected:
      maxSets > 0 && STRENGTH_GROUPS.includes(row.group) && row.sets < threshold,
  }));

  return {
    rows,
    neglected: rows.filter((row) => row.neglected).map((row) => row.group),
  };
}
