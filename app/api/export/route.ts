import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ENTRY_CSV_COLUMNS, toCsv } from "@/lib/csv";

/**
 * GET /api/export — every logged entry as CSV, one row per entry.
 * The record's name/type/unit/direction are repeated so the file round-trips
 * through /api/import.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const records = await prisma.personalBest.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { attempts: { orderBy: { date: "asc" } } },
  });

  const rows = records.flatMap((record) =>
    record.attempts.map((attempt) => ({
      name: record.name,
      type: record.type,
      unit: record.unit,
      direction: record.direction,
      value: attempt.value,
      reps: attempt.reps ?? "",
      date: attempt.date.toISOString().slice(0, 10),
      notes: attempt.notes ?? "",
      isBest: attempt.isBest,
    })),
  );

  const csv = toCsv(rows, ENTRY_CSV_COLUMNS);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pr-tracker-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
