import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { QuestLog } from "@/components/quests/quest-log";

export const metadata: Metadata = {
  title: "Quest Log — FitTrack",
};

export default async function QuestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const quests = await prisma.quest.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 100,
    include: { rewards: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Quest Log</h1>
      <QuestLog quests={quests} />
    </div>
  );
}
