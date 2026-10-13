import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalBestList } from "@/components/personal-bests/personal-best-list";
import { ProgressChart } from "@/components/personal-bests/progress-chart";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatValue } from "@/lib/personal-best";

export const metadata: Metadata = {
  title: "Body Metrics — PR Tracker",
};

export default async function BodyMetricsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const metrics = await prisma.personalBest.findMany({
    where: { userId: user.id, type: "BODY_METRIC" },
    orderBy: [{ achievedAt: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { attempts: true, achievements: true } },
      attempts: { orderBy: { date: "asc" } },
    },
  });

  const featured = metrics[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Body metrics</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Weight, measurements and body composition over time
          </p>
        </div>
        <Button asChild size="sm">
          <Link
            href="/personal-bests/new?type=BODY_METRIC"
            transitionTypes={["nav-forward"]}
          >
            + Log metric
          </Link>
        </Button>
      </div>

      {featured ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{featured.name}</CardTitle>
                <div className="text-right">
                  <p className="text-lg font-semibold tabular-nums">
                    {formatValue(featured.bestValue, featured.unit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(featured.achievedAt)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ProgressChart
                points={featured.attempts.map((a) => ({
                  value: a.value,
                  date: a.date,
                  isBest: a.isBest,
                }))}
                unit={featured.unit}
                direction={featured.direction}
                bestValue={featured.bestValue}
                target={featured.targetValue}
              />
            </CardContent>
          </Card>

          <PersonalBestList
            personalBests={metrics}
            emptyMessage="No body metrics tracked yet."
          />
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-2xl">📏</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Track weight, waist, body fat and more to see trends over time.
            </p>
            <Button asChild className="mt-4">
              <Link href="/personal-bests/new?type=BODY_METRIC">
                Log your first metric
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
