import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ConsistencyChart } from "@/components/dashboard/consistency-chart";
import { BenchmarkChart } from "@/components/dashboard/benchmark-chart";
import { GoalCountdown } from "@/components/dashboard/goal-countdown";
import { AiSuggestion } from "@/components/dashboard/ai-suggestion";
import { FitnessRadarChart } from "@/components/dashboard/radar-chart";
import { DailyQuests } from "@/components/dashboard/daily-quests";
import { WeeklyProgress } from "@/components/dashboard/weekly-progress";

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

  // Hunter Level + Rank
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <span className="text-sm font-medium px-3 py-1 bg-neutral-900 text-white rounded-full">
          Lv.{level} · Rank {rank}
        </span>
      </div>

      {/* Goal countdowns */}
      <GoalCountdown goals={goals} />

      {/* Radar + Weekly Progress side by side on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FitnessRadarChart stats={stats} />
        <div className="space-y-4">
          <WeeklyProgress sessions={sessions} target={5} />
          <AiSuggestion />
        </div>
      </div>

      {/* Daily Quests */}
      <DailyQuests />

      {/* Benchmark Progress */}
      <BenchmarkChart benchmarks={benchmarks} standards={standards} />
    </div>
  );
}
