import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ConsistencyChart } from "@/components/dashboard/consistency-chart";
import { BenchmarkChart } from "@/components/dashboard/benchmark-chart";
import { GoalCountdown } from "@/components/dashboard/goal-countdown";
import { AiSuggestion } from "@/components/dashboard/ai-suggestion";
import { FitnessRadarChart } from "@/components/dashboard/radar-chart";
import { DailyQuests } from "@/components/dashboard/daily-quests";
import { WeeklyProgress } from "@/components/dashboard/weekly-progress";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — FitTrack",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [sessions, goals, benchmarks, standards, stats, initialQuests] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 200,
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
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.fitnessStandard.findMany(),
    prisma.stat.findMany({
      where: { userId: user.id },
      orderBy: { type: "asc" },
    }),
    prisma.quest.findMany({
      where: { userId: user.id, date: { gte: today } },
      orderBy: { createdAt: "asc" },
      include: { rewards: true },
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
      {/* Header with gamified rank badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Welcome back, {user.name ?? "Hunter"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Rank badge */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">Hunter Rank</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div
                className={`size-2 rounded-full ${
                  rank === "S"
                    ? "bg-yellow-400 shadow-lg shadow-yellow-400/50"
                    : rank === "A"
                      ? "bg-orange-400 shadow-lg shadow-orange-400/40"
                      : rank === "B"
                        ? "bg-green-400 shadow-lg shadow-green-400/30"
                        : rank === "C"
                          ? "bg-blue-400 shadow-lg shadow-blue-400/30"
                          : rank === "D"
                            ? "bg-purple-400 shadow-lg shadow-purple-400/20"
                            : "bg-gray-400"
                }`}
              />
              <span
                className={`text-xl font-extrabold tracking-tight ${
                  rank === "S"
                    ? "text-yellow-400"
                    : rank === "A"
                      ? "text-orange-400"
                      : "text-foreground"
                }`}
              >
                {rank}
              </span>
            </div>
          </div>
          {/* Level */}
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium">Level</span>
            <p className="text-lg font-bold leading-tight">{level}</p>
          </div>
          {/* Progress to next rank */}
          <div className="w-16">
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-medium block text-right">Progress</span>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-700 ${
                  rank === "S"
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-300"
                    : "bg-primary"
                }`}
                style={{ width: `${(level % 10) * 10}%` }}
              />
            </div>
          </div>
        </div>
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
      <DailyQuests initialQuests={initialQuests} />

      {/* Benchmark Progress */}
      <BenchmarkChart benchmarks={benchmarks} standards={standards} />
    </div>
  );
}
