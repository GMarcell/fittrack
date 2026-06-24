import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoalSchema } from "@/validation/goals";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "active";

  const where = {
    userId: user.id,
    ...(status === "all"
      ? {}
      : status === "archived"
        ? { status: "ARCHIVED" as const }
        : { status: "ACTIVE" as const }),
  };

  const goals = await prisma.goal.findMany({
    where,
    orderBy: [{ priority: "asc" }, { targetDate: "asc" }],
  });

  return NextResponse.json(goals);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const goal = await prisma.goal.create({
    data: {
      userId: user?.id ?? "",
      name: parsed.data.name,
      priority: parsed.data.priority,
      targetDate: parsed.data?.targetDate ?? null,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}
