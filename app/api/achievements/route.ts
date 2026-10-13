import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/achievements — every record broken, newest first. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 200);

  const achievements = await prisma.achievement.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      personalBest: { select: { id: true, name: true, unit: true } },
    },
  });

  return NextResponse.json(achievements);
}
