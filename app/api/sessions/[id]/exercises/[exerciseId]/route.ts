import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateSessionExerciseSchema } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string; exerciseId: string }> };

async function findOwnedExercise(userId: string, sessionId: string, exerciseId: string) {
  return prisma.sessionExercise.findFirst({
    where: { id: exerciseId, sessionId, session: { userId } },
  });
}

/**
 * PATCH /api/sessions/[id]/exercises/[exerciseId] — update exercise details
 * (e.g. switch the weight unit KG ⇄ LB).
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, exerciseId } = await params;
  const exercise = await findOwnedExercise(user.id, id, exerciseId);
  if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateSessionExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const updated = await prisma.sessionExercise.update({
    where: { id: exercise.id },
    data: parsed.data,
    include: { sets: true },
  });

  return NextResponse.json({ exercise: updated });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, exerciseId } = await params;
  const exercise = await findOwnedExercise(user.id, id, exerciseId);
  if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.sessionExercise.delete({ where: { id: exercise.id } });
  return NextResponse.json({ ok: true });
}
