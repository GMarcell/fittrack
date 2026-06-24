import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { QuestStatus } from "@prisma/client";
import { generateQuestsForUser } from "@/lib/quest";

export async function GET() {
  const user = await getCurrentUser();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.quest.findMany({
    where: { userId: user.id, date: { gte: today } },
    include: { rewards: true },
    orderBy: { createdAt: "asc" },
  });

  if (existing.length > 0) return NextResponse.json(existing);

  // None exist yet — generate fresh
  const quests = await generateQuestsForUser(user.id);
  return NextResponse.json(quests);
}
