import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createSessionSchema, dateKeyInTimezone } from "@/lib/session";

/**
 * POST /api/sessions — starts a workout session. If an unfinished session
 * already exists for the same calendar day it is returned instead of creating
 * a duplicate.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { date, planDay, sessionType, exercises } = parsed.data;
  const sessionDate = date ?? new Date();
  const timeZone = user.timezone || "Asia/Jakarta";

  // Match on the user's calendar day, not the server's, so /today and this
  // route agree on which sessions belong to the same workout.
  const dayKey = dateKeyInTimezone(sessionDate, timeZone);
  const since = new Date(sessionDate);
  since.setDate(since.getDate() - 3);

  const openSessions = await prisma.workoutSession.findMany({
    where: { userId: user.id, completedAt: null, date: { gte: since } },
    include: { exercises: { include: { sets: true } } },
    orderBy: { date: "desc" },
  });

  const existing = openSessions.find((s) => dateKeyInTimezone(s.date, timeZone) === dayKey);
  if (existing) return NextResponse.json({ session: existing, resumed: true }, { status: 200 });

  const session = await prisma.workoutSession.create({
    data: {
      userId: user.id,
      date: sessionDate,
      planDay: planDay ?? null,
      sessionType: sessionType ?? null,
      exercises: {
        create: (exercises ?? []).map((ex, i) => ({
          name: ex.name,
          muscleGroup: ex.muscleGroup ?? null,
          unit: ex.unit ?? null,
          targetSets: ex.targetSets ?? null,
          repTarget: ex.repTarget ?? null,
          rpeTarget: ex.rpeTarget ?? null,
          sortOrder: i,
        })),
      },
    },
    include: { exercises: { include: { sets: true }, orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ session }, { status: 201 });
}
