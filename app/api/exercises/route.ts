import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createExerciseSchema } from "@/validation/exercise";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const exercises = await prisma.exercise.findMany({
    where: { userId: user.id },
  });
  return NextResponse.json(exercises);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const exercise = await prisma.exercise.create({
    data: {
      userId: user?.id ?? "",
      name: parsed.data.name,
      category: parsed.data.category,
      unit: parsed.data.unit,
    },
  });

  return NextResponse.json(exercise, { status: 201 });
}
