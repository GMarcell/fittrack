import { prisma } from "@/lib/prisma";
import { QuestStatus } from "@prisma/client";

/**
 * Resolves all PENDING quests that are past their day boundary.
 * Called by the cron job and lazily on dashboard load.
 */
export async function runQuestFailureSweep(userId?: string) {
  const now = new Date();

  // Proper UTC midnight for today
  const todayUTCMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const where = {
    status: QuestStatus.PENDING,
    date: { lt: todayUTCMidnight },
    ...(userId ? { userId } : {}),
  };

  const expiredQuests = await prisma.quest.findMany({
    where,
    include: { rewards: true },
  });

  if (expiredQuests.length === 0) return { resolved: 0 };

  await prisma.$transaction([
    prisma.quest.updateMany({
      where,
      data: { status: QuestStatus.FAILED, resolvedAt: now },
    }),
    ...expiredQuests.flatMap((quest) =>
      quest.rewards.map((r) =>
        prisma.stat.update({
          where: { userId_type: { userId: quest.userId, type: r.type } },
          data: { value: { decrement: r.failurePenalty } },
        }),
      ),
    ),
    ...expiredQuests.flatMap((quest) =>
      quest.rewards.map((r) =>
        prisma.statHistory.create({
          data: {
            userId: quest.userId,
            type: r.type,
            delta: -r.failurePenalty,
            reason: `Quest failed: ${quest.title}`,
            questId: quest.id,
          },
        }),
      ),
    ),
  ]);

  return { resolved: expiredQuests.length };
}
