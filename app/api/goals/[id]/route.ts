import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateGoalSchema } from "@/validation/goals";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const user = await getCurrentUser();

  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await prisma.goal.findFirst({
    where: { id: id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const goal = await prisma.goal.update({
    where: {
      id: id,
    },
    data: {
      ...parsed.data,
    },
  });
  return NextResponse.json(goal, { status: 200 });
}

export async function DELETE(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const existing = await prisma.goal.findFirst({
    where: { id: id, userId: user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deletedGoal = await prisma.goal.delete({
    where: {
      id: id,
    },
  });

  return NextResponse.json(deletedGoal, { status: 200 });
}
