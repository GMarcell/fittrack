import { prisma } from "@/lib/prisma";
import { QuestStatus, Prisma } from "@prisma/client";

function buildWhereClause(
  status: QuestStatus,
  date: Date,
  userId?: string,
): Prisma.QuestWhereInput {
  return {
    status,
    date: { lt: date },
    ...(userId ? { userId } : {}),
  };
}

/**
 * Resolves all accepted-but-unresolved (PENDING) quests past their day boundary.
 * Called by the cron job.
 */
export async function runQuestFailureSweep(userId?: string) {
  const now = new Date();

  // Use local midnight (matches how quests are created in quest.ts and today/route)
  const todayMidnight = new Date(now);
  todayMidnight.setHours(0, 0, 0, 0);

  const expiredWhere = buildWhereClause(QuestStatus.PENDING, todayMidnight, userId);

  const expiredQuests = await prisma.quest.findMany({
    where: expiredWhere,
    include: { rewards: true },
  });

  // Also sweep stale OFFERED quests (never accepted, past their day)
  const staleOfferedWhere = buildWhereClause(QuestStatus.OFFERED, todayMidnight, userId);

  if (expiredQuests.length === 0) {
    // Still clean up any stale OFFERED quests
    await prisma.quest.deleteMany({ where: staleOfferedWhere });
    return { resolved: 0 };
  }

  await prisma.$transaction([
    prisma.quest.updateMany({
      where: expiredWhere,
      data: { status: QuestStatus.FAILED, resolvedAt: now },
    }),
    prisma.quest.deleteMany({ where: staleOfferedWhere }),
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
