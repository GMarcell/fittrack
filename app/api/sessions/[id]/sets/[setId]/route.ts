import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string; setId: string }> };

/** DELETE /api/sessions/[id]/sets/[setId] — remove a logged set. */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, setId } = await params;
  const session = await prisma.workoutSession.findFirst({ where: { id, userId: user.id } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.completedAt) {
    return NextResponse.json({ error: "Session already completed" }, { status: 409 });
  }

  const set = await prisma.setEntry.findFirst({
    where: { id: setId, sessionExercise: { sessionId: id } },
  });
  if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.setEntry.delete({ where: { id: set.id } });
  return NextResponse.json({ ok: true });
}
