import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ConsistencyChart } from "@/components/dashboard/consistency-chart";
import { BenchmarkChart } from "@/components/dashboard/benchmark-chart";
import { ActivityMix } from "@/components/dashboard/activity-mix";
import { GoalCountdown } from "@/components/dashboard/goal-countdown";
import { AiSuggestion } from "@/components/dashboard/ai-suggestion";
import { FitnessRadarChart } from "@/components/dashboard/radar-chart";
import { DailyQuests } from "@/components/dashboard/daily-quests";
import { generateQuestsForUser } from "@/lib/quest";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch today's quests — generate if none exist
  let quests = await prisma.quest.findMany({
    where: { userId: user.id, date: { gte: today } },
    include: { rewards: true },
    orderBy: { createdAt: "asc" },
  });

  if (quests.length === 0) {
    quests = await generateQuestsForUser(user.id);
  }

  const [sessions, goals, benchmarks, standards, stats] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      include: {
        activityType: true,
        sessionExercises: { include: { exercise: true } },
      },
    }),
    prisma.goal.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: [{ priority: "asc" }, { targetDate: "asc" }],
    }),
    prisma.benchmark.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    }),
    prisma.fitnessStandard.findMany(),
    prisma.stat.findMany({
      where: { userId: user.id },
      orderBy: { type: "asc" },
    }),
  ]);

  const avgStat = stats.length
    ? stats.reduce((sum, s) => sum + s.value, 0) / stats.length
    : 0;
  const level = Math.round(avgStat);
  const rank =
    avgStat <= 20
      ? "E"
      : avgStat <= 35
        ? "D"
        : avgStat <= 50
          ? "C"
          : avgStat <= 65
            ? "B"
            : avgStat <= 80
              ? "A"
              : "S";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <span className="text-sm font-medium text-muted-foreground">
          Lv.{level} · Rank {rank}
        </span>
      </div>
      <GoalCountdown goals={goals} />
      <DailyQuests initialQuests={quests} />
      <AiSuggestion />
      <FitnessRadarChart stats={stats} />
      <ConsistencyChart sessions={sessions} />
      <BenchmarkChart benchmarks={benchmarks} standards={standards} />
      <ActivityMix sessions={sessions} />
    </div>
  );
}
