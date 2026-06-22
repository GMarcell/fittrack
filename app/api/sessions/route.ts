import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSessionSchema } from "@/validation/session";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    include: {
      activityType: true,
      goal: true,
    },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { sessionExercises, ...sessionData } = parsed.data;

  const session = await prisma.session.create({
    data: {
      ...sessionData,
      userId: user?.id ?? "",
      sessionExercises: sessionExercises
        ? {
            create: sessionExercises,
          }
        : undefined,
    },
    include: {
      sessionExercises: true,
    },
  });

  return NextResponse.json(session, { status: 201 });
}
