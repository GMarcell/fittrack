import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateExerciseSchema } from "@/validation/exercise";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const user = await getCurrentUser();

  const parsed = updateExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.exercise.findFirst({
    where: { id: id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const exercise = await prisma.exercise.update({
    where: {
      id: id,
    },
    data: {
      ...parsed.data,
    },
  });
  return NextResponse.json(exercise, { status: 200 });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const existing = await prisma.exercise.findFirst({
    where: { id: id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deletedExercise = await prisma.exercise.delete({
    where: {
      id: id,
    },
  });

  return NextResponse.json(deletedExercise, { status: 200 });
}
