import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCards } from "@/components/dashboard/stat-cards";
import { ConsistencyCard } from "@/components/dashboard/consistency-card";
import { PrFeed } from "@/components/dashboard/pr-feed";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { PersonalBestList } from "@/components/personal-bests/personal-best-list";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatValue } from "@/lib/personal-best";

export const metadata: Metadata = {
  title: "Dashboard — PR Tracker",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    records,
    recentAttempts,
    recentAchievements,
    lastAchievement,
    prsLast30Days,
    improvedLast30Days,
  ] = await Promise.all([
    prisma.personalBest.findMany({
      where: { userId: user.id },
      orderBy: [{ achievedAt: "desc" }, { name: "asc" }],
      include: {
        attempts: {
          orderBy: { date: "desc" },
          take: 12,
          select: { value: true, date: true },
        },
        _count: { select: { attempts: true, achievements: true } },
      },
    }),
    prisma.attempt.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 6,
      include: {
        personalBest: { select: { id: true, name: true, unit: true } },
      },
    }),
    prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 5,
      include: {
        personalBest: { select: { id: true, name: true, unit: true } },
      },
    }),
    prisma.achievement.findFirst({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      select: { date: true },
    }),
    prisma.achievement.count({
      where: { userId: user.id, date: { gte: thirtyDaysAgo } },
    }),
    prisma.achievement.findMany({
      where: { userId: user.id, date: { gte: thirtyDaysAgo } },
      select: {
        value: true,
        previousValue: true,
        personalBest: { select: { name: true, unit: true } },
      },
    }),
  ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const exerciseCount = records.filter((r) => r.type === "EXERCISE").length;
  const improvedThisMonth = records.filter(
    (r) => new Date(r.achievedAt) >= startOfMonth,
  ).length;
  const verifiedCount = records.filter((r) => r.verified).length;
  const totalAttempts = records.reduce((sum, r) => sum + r._count.attempts, 0);
  const strongest = records[0];

  const distinctImproved = new Set(
    improvedLast30Days.map((a) => a.personalBest.name),
  ).size;

  const mostImproved = improvedLast30Days.reduce<{
    name: string;
    delta: number;
    unit: (typeof improvedLast30Days)[number]["personalBest"]["unit"];
  } | null>((best, item) => {
    if (item.previousValue === null) return best;
    const delta = Math.abs(item.value - item.previousValue);
    if (!best || delta > best.delta) {
      return {
        name: item.personalBest.name,
        delta: Math.round(delta * 100) / 100,
        unit: item.personalBest.unit,
      };
    }
    return best;
  }, null);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Personal bests</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every PR you have logged, in one place
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/personal-bests/new" transitionTypes={["nav-forward"]}>
            + Log PR
          </Link>
        </Button>
      </div>

      <StatCards
        stats={[
          { label: "Records tracked", value: records.length },
          { label: "Exercise PRs", value: exerciseCount },
          {
            label: "Improved this month",
            value: improvedThisMonth,
            hint: `${verifiedCount} verified`,
          },
        ]}
      />

      <ConsistencyCard
        lastPrAt={lastAchievement?.date ?? null}
        prsLast30Days={prsLast30Days}
        recordsImprovedLast30Days={distinctImproved}
        mostImproved={mostImproved}
      />

      {strongest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest best</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div>
              <Link
                href={`/personal-bests/${strongest.id}`}
                className="text-sm font-medium hover:underline"
              >
                {strongest.name}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {strongest._count.achievements} PR
                {strongest._count.achievements === 1 ? "" : "s"} ·{" "}
                {strongest._count.attempts} entries logged
              </p>
            </div>
            <p className="text-2xl font-semibold tabular-nums">
              {formatValue(strongest.bestValue, strongest.unit)}
            </p>
          </CardContent>
        </Card>
      )}

      <PrFeed achievements={recentAchievements} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Top records</CardTitle>
            <Link
              href="/personal-bests"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              See all {totalAttempts} entries →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <PersonalBestList
            personalBests={records.slice(0, 5)}
            emptyMessage="Log your first personal best to get started."
          />
        </CardContent>
      </Card>

      <RecentActivity activity={recentAttempts} />
    </div>
  );
}
