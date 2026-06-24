import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();

  const quest = await prisma.quest.findFirst({
    where: { id: id, userId: user.id },
  });

  if (!quest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (quest.status !== "OFFERED") {
    return NextResponse.json(
      { error: "Quest already accepted or resolved" },
      { status: 400 },
    );
  }

  const updated = await prisma.quest.update({
    where: { id: id },
    data: { status: "PENDING", acceptedAt: new Date() },
    include: { rewards: true },
  });

  return NextResponse.json(updated);
}
