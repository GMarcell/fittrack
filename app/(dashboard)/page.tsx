import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ConsistencyChart } from "@/components/dashboard/consistency-chart";
import { BenchmarkChart } from "@/components/dashboard/benchmark-chart";
import { GoalCountdown } from "@/components/dashboard/goal-countdown";
import { ActivityMix } from "@/components/dashboard/activity-mix";
import { AiSuggestion } from "@/components/dashboard/ai-suggestion";
import { FitnessRadarChart } from "@/components/dashboard/radar-chart";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [sessions, goals, benchmarks, standards] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      include: {
        activityType: true,
        sessionExercises: {
          include: { exercise: true },
        },
      },
    }),
    prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { priority: "asc" },
    }),
    prisma.benchmark.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
    }),
    prisma.fitnessStandard.findMany(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <AiSuggestion />
      <GoalCountdown goals={goals} />
      <FitnessRadarChart sessions={sessions} />
      <ConsistencyChart sessions={sessions} />
      <BenchmarkChart benchmarks={benchmarks} standards={standards} />
      <ActivityMix sessions={sessions} />
    </div>
  );
}
