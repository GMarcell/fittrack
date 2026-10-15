import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sessionExerciseInputSchema } from "@/lib/session";
import { classifyExercise } from "@/lib/muscle-groups";

type RouteContext = { params: Promise<{ id: string }> };

/** POST /api/sessions/[id]/exercises — add an extra exercise to a session. */
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
  const parsed = sessionExerciseInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const maxOrder = await prisma.sessionExercise.count({ where: { sessionId: id } });

  const exercise = await prisma.sessionExercise.create({
    data: {
      sessionId: id,
      name: parsed.data.name,
      muscleGroup: parsed.data.muscleGroup ?? classifyExercise(parsed.data.name),
      unit: parsed.data.unit ?? null,
      targetSets: parsed.data.targetSets ?? null,
      repTarget: parsed.data.repTarget ?? null,
      rpeTarget: parsed.data.rpeTarget ?? null,
      sortOrder: maxOrder,
    },
    include: { sets: true },
  });

  return NextResponse.json({ exercise }, { status: 201 });
}
