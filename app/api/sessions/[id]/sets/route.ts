import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { setEntryInputSchema } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/sessions/[id]/sets — append one logged set to an exercise. */
export async function POST(req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const session = await prisma.workoutSession.findFirst({ where: { id, userId: user.id } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.completedAt) {
    return NextResponse.json({ error: "Session already completed" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = setEntryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const exercise = await prisma.sessionExercise.findFirst({
    where: { id: parsed.data.exerciseId, sessionId: id },
  });
  if (!exercise) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  const count = await prisma.setEntry.count({ where: { sessionExerciseId: exercise.id } });

  const set = await prisma.setEntry.create({
    data: {
      sessionExerciseId: exercise.id,
      setNumber: count + 1,
      weight: parsed.data.weight ?? null,
      reps: parsed.data.reps,
      rpe: parsed.data.rpe ?? null,
    },
  });

  return NextResponse.json({ set }, { status: 201 });
}
