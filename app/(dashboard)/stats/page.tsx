import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ConsistencyChart } from "@/components/dashboard/consistency-chart";
import { StatHistoryChart } from "@/components/dashboard/stat-history-chart";

export const metadata: Metadata = {
  title: "Stats & Progress — FitTrack",
};

export default async function StatsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [stats, history, sessions] = await Promise.all([
    prisma.stat.findMany({
      where: { userId: user.id },
      orderBy: { type: "asc" },
    }),
    prisma.statHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      take: 500,
    }),
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 200,
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
