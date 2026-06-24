import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  const body = await req.json().catch(() => ({}));
  const { sessionId } = body;

  const quest = await prisma.quest.findFirst({
    where: { id: id, userId: user.id },
    include: { rewards: true },
  });

  if (!quest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (quest.status !== "PENDING") {
    return NextResponse.json(
      { error: "Quest must be accepted before completing" },
      { status: 400 },
    );
  }

  // Apply stat gains + write history in a transaction
  await prisma.$transaction([
    prisma.quest.update({
      where: { id: id },
      data: {
        status: "COMPLETED",
        resolvedAt: new Date(),
        ...(sessionId ? { sessionId } : {}),
      },
    }),
    ...quest.rewards.map((r) =>
      prisma.stat.update({
        where: { userId_type: { userId: user.id, type: r.type } },
        data: { value: { increment: r.completionValue } },
      }),
    ),
    ...quest.rewards.map((r) =>
      prisma.statHistory.create({
        data: {
          userId: user.id,
          type: r.type,
          delta: r.completionValue,
          reason: `Quest completed: ${quest.title}`,
          questId: quest.id,
        },
      }),
    ),
  ]);

  const updated = await prisma.quest.findUnique({
    where: { id: id },
    include: { rewards: true },
  });

  return NextResponse.json(updated);
}
