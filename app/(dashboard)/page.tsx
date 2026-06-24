import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ConsistencyChart } from "@/components/dashboard/consistency-chart";
import { BenchmarkChart } from "@/components/dashboard/benchmark-chart";
import { ActivityMix } from "@/components/dashboard/activity-mix";
import { GoalCountdown } from "@/components/dashboard/goal-countdown";
import { AiSuggestion } from "@/components/dashboard/ai-suggestion";
import { FitnessRadarChart } from "@/components/dashboard/radar-chart";

export default async function DashboardPage() {
  const user = await getCurrentUser();

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

  // Compute Hunter Level (average of all 8 stats)
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
        <span className="text-sm font-medium text-neutral-500">
          Lv.{level} · Rank {rank}
        </span>
      </div>
      <GoalCountdown goals={goals} />
      <FitnessRadarChart stats={stats} />
      <AiSuggestion />
      <ConsistencyChart sessions={sessions} />
      <BenchmarkChart benchmarks={benchmarks} standards={standards} />
      <ActivityMix sessions={sessions} />
    </div>
  );
}
