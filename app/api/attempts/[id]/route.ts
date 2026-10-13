import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { recomputeBest } from "@/lib/personal-best-service";

type RouteContext = { params: Promise<{ id: string }> };

/** DELETE /api/attempts/[id] — removes an entry and rebuilds the record's best. */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: user.id },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const personalBest = await prisma.$transaction(async (tx) => {
    await tx.attempt.delete({ where: { id } });
    return recomputeBest(tx, attempt.personalBestId);
  });

  return NextResponse.json({ success: true, personalBest });
}
