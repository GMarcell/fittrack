import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();

  const existing = await prisma.goal.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status === "ARCHIVED") {
    return NextResponse.json(
      { error: "Goal already archived" },
      { status: 400 },
    );
  }

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
  });

  return NextResponse.json(goal);
}
