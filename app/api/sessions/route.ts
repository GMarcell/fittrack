import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createSessionSchema } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const goalId = searchParams.get("goalId") ?? undefined;
  const activityTypeId = searchParams.get("activityTypeId") ?? undefined;

  const sessions = await prisma.session.findMany({
    where: { userId: user.id, goalId, activityTypeId },
    orderBy: { date: "desc" },
    include: {
      activityType: true,
      goal: true,
      sessionExercises: { include: { exercise: true } },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { sessionExercises, statBoosts, ...sessionData } = parsed.data;

  const session = await prisma.session.create({
    data: {
      ...sessionData,
      userId: user.id,
      sessionExercises: sessionExercises
        ? { create: sessionExercises }
        : undefined,
    },
    include: {
      activityType: true,
      goal: true,
      sessionExercises: { include: { exercise: true } },
    },
  });

  // Apply stat boosts if provided
  if (statBoosts && statBoosts.length > 0) {
    await prisma.$transaction([
      ...statBoosts.map((boost) =>
        prisma.stat.update({
          where: { userId_type: { userId: user.id, type: boost.type } },
          data: { value: { increment: boost.value } },
        }),
      ),
      ...statBoosts.map((boost) =>
        prisma.statHistory.create({
          data: {
            userId: user.id,
            type: boost.type,
            delta: boost.value,
            reason: `Session logged: ${session.focus ?? sessionData.activityTypeId}`,
          },
        }),
      ),
    ]);
  }

  return NextResponse.json(session, { status: 201 });
}
