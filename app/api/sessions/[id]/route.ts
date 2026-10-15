import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateSessionSchema } from "@/lib/session";
import { syncSessionToPersonalBests } from "@/lib/session-service";

type RouteContext = { params: Promise<{ id: string }> };

async function findOwnedSession(userId: string, id: string) {
  return prisma.workoutSession.findFirst({ where: { id, userId } });
}

/**
 * PATCH /api/sessions/[id] — update notes/date, or complete the session.
 * Completing syncs the best set of every exercise into its record.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await findOwnedSession(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { notes, date, complete } = parsed.data;

  if (complete) {
    const synced = await prisma.$transaction((tx) =>
      syncSessionToPersonalBests(tx, user.id, id),
    );
    const session = await prisma.workoutSession.findUnique({
      where: { id },
      include: { exercises: { include: { sets: true }, orderBy: { sortOrder: "asc" } } },
    });
    return NextResponse.json({ session, synced });
  }

  const session = await prisma.workoutSession.update({
    where: { id },
    data: {
      ...(notes !== undefined ? { notes } : {}),
      ...(date !== undefined ? { date } : {}),
    },
    include: { exercises: { include: { sets: true }, orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ session });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await findOwnedSession(user.id, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workoutSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
