import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { QuestLog } from "@/components/quests/quest-log";

export default async function QuestsPage() {
  const user = await getCurrentUser();

  const quests = await prisma.quest.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    include: { rewards: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Quest Log</h1>
      <QuestLog quests={quests} />
    </div>
  );
}
