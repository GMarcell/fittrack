import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import {
  DIRECTIONS,
  PERSONAL_BEST_UNITS,
  defaultDirection,
  presetsFor,
  unitsFor,
  type Direction,
  type PersonalBestTypeValue,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";
import { logEntry } from "@/lib/personal-best-service";

const MAX_ROWS = 5000;

type ImportRow = { value: number; reps?: number; date: Date; notes?: string };

/**
 * Identity of a logged entry, used to make re-importing a file a no-op
 * instead of silently duplicating the whole history.
 */
function entryKey(value: number, date: Date, reps?: number | null): string {
  return `${date.toISOString().slice(0, 10)}|${value}|${reps ?? ""}`;
}

type Group = {
  type: PersonalBestTypeValue;
  name: string;
  unit: PersonalBestUnitValue;
  direction: Direction;
  rows: ImportRow[];
};

/**
 * POST /api/import
 *
 * Body: `{ csv: string }` — one row per entry. Accepts the same columns as
 * /api/export, and is forgiving about the optional ones.
 *
 * Imported history is replayed in date order, so records are rebuilt and the
 * achievements they produced are recreated as real events.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const csv = typeof body?.csv === "string" ? body.csv : "";

  if (!csv.trim()) {
    return NextResponse.json({ error: "No CSV content provided." }, { status: 400 });
  }

  const { rows } = parseCsv(csv);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "The file has a header but no rows." },
      { status: 400 },
    );
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Too many rows (${rows.length}). The limit is ${MAX_ROWS}.` },
      { status: 400 },
    );
  }

  const groups = new Map<string, Group>();
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const line = index + 2; // header is line 1

    const name = row.name?.trim();
    if (!name) {
      errors.push(`Line ${line}: missing name`);
      return;
    }

    const value = Number(row.value);
    if (row.value === "" || !Number.isFinite(value)) {
      errors.push(`Line ${line}: "${row.value}" is not a number`);
      return;
    }

    const date = new Date(row.date);
    if (!row.date || Number.isNaN(date.getTime())) {
      errors.push(`Line ${line}: "${row.date}" is not a date`);
      return;
    }

    const type: PersonalBestTypeValue =
      row.type?.toUpperCase() === "BODY_METRIC" ? "BODY_METRIC" : "EXERCISE";

    const preset = presetsFor(type).find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );

    const rawUnit = (row.unit || preset?.unit || unitsFor(type)[0]).toUpperCase();
    if (!(PERSONAL_BEST_UNITS as readonly string[]).includes(rawUnit)) {
      errors.push(`Line ${line}: unknown unit "${row.unit}"`);
      return;
    }
    const unit = rawUnit as PersonalBestUnitValue;

    const rawDirection = row.direction?.toUpperCase();
    const direction: Direction = (DIRECTIONS as readonly string[]).includes(
      rawDirection ?? "",
    )
      ? (rawDirection as Direction)
      : (preset?.direction ?? defaultDirection(type, unit));

    let reps: number | undefined;
    if (row.reps) {
      const parsedReps = Number(row.reps);
      if (!Number.isInteger(parsedReps) || parsedReps < 1) {
        errors.push(`Line ${line}: "${row.reps}" is not a whole number of reps`);
        return;
      }
      reps = parsedReps;
    }

    const key = `${type}::${name.toLowerCase()}`;
    const group = groups.get(key) ?? {
      type,
      name,
      unit,
      direction,
      rows: [],
    };
    group.rows.push({ value, reps, date, notes: row.notes || undefined });
    groups.set(key, group);
  });

  let recordsCreated = 0;
  let recordsUpdated = 0;
  let entriesImported = 0;
  let achievements = 0;
  let duplicates = 0;

  for (const group of groups.values()) {
    const existing = await prisma.personalBest.findUnique({
      where: {
        userId_type_name: {
          userId: user.id,
          type: group.type,
          name: group.name,
        },
      },
      include: {
        attempts: { select: { value: true, date: true, reps: true } },
      },
    });

    if (existing && existing.unit !== group.unit) {
      errors.push(
        `"${group.name}" is already tracked in ${existing.unit} — ${group.rows.length} row(s) skipped`,
      );
      continue;
    }

    const unit = (existing?.unit ?? group.unit) as PersonalBestUnitValue;
    const direction = (existing?.direction ?? group.direction) as Direction;

    const seen = new Set(
      (existing?.attempts ?? []).map((attempt) =>
        entryKey(attempt.value, attempt.date, attempt.reps),
      ),
    );

    const ordered = [...group.rows]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .filter((row) => {
        const key = entryKey(row.value, row.date, row.reps);
        if (seen.has(key)) {
          duplicates += 1;
          return false;
        }
        seen.add(key);
        return true;
      });

    if (ordered.length === 0) continue;

    await prisma.$transaction(async (tx) => {
      let recordId = existing?.id;
      let best = existing?.bestValue ?? ordered[0].value;

      if (!recordId) {
        const created = await tx.personalBest.create({
          data: {
            userId: user.id,
            type: group.type,
            name: group.name,
            unit,
            direction,
            bestValue: ordered[0].value,
            achievedAt: ordered[0].date,
          },
        });
        recordId = created.id;
      }

      for (const [index, row] of ordered.entries()) {
        const logged = await logEntry(
          tx,
          {
            id: recordId,
            userId: user.id,
            unit,
            direction,
            bestValue: best,
          },
          {
            value: row.value,
            date: row.date,
            notes: row.notes,
            reps: row.reps,
            isFirstEntry: index === 0 && !existing,
          },
        );

        if (logged.isPersonalBest) {
          best = row.value;
          achievements += 1;
        }
        entriesImported += 1;
      }
    });

    if (existing) recordsUpdated += 1;
    else recordsCreated += 1;
  }

  return NextResponse.json({
    summary: {
      recordsCreated,
      recordsUpdated,
      entriesImported,
      achievements,
      duplicates,
      skipped: errors.length,
    },
    errors: errors.slice(0, 20),
  });
}
