import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ConsistencyChart } from "@/components/dashboard/consistency-chart";
import { StatHistoryChart } from "@/components/dashboard/stat-history-chart";

export default async function StatsPage() {
  const user = await getCurrentUser();

  const [stats, history, sessions] = await Promise.all([
    prisma.stat.findMany({
      where: { userId: user.id },
      orderBy: { type: "asc" },
    }),
    prisma.statHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { date: "asc" },
      include: { activityType: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Stats & Progress</h1>
      <ConsistencyChart sessions={sessions} />
      <StatHistoryChart stats={stats} history={history} />
    </div>
  );
}
