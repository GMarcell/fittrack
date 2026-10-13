import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/personal-bests/progress-chart";
import { ProgressPicker } from "@/components/personal-bests/progress-picker";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  DIRECTION_LABELS,
  TYPE_LABELS,
  formatDate,
  formatValue,
  targetProgress,
} from "@/lib/personal-best";

export const metadata: Metadata = {
  title: "Progress — PR Tracker",
};

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await searchParams;

  const records = await prisma.personalBest.findMany({
    where: { userId: user.id },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true },
  });

  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Progress</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-2xl">📈</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Log a few entries and your progress will show up here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/personal-bests/new">Log your first PR</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedId = id && records.some((r) => r.id === id) ? id : records[0].id;

  const selected = await prisma.personalBest.findFirst({
    where: { id: selectedId, userId: user.id },
    include: { attempts: { orderBy: { date: "asc" } } },
  });

  if (!selected) redirect("/progress");

  const direction = selected.direction;
  const first = selected.attempts[0];
  const change =
    first && selected.attempts.length > 1 && direction !== "LATEST"
      ? direction === "LOWER"
        ? first.value - selected.bestValue
        : selected.bestValue - first.value
      : 0;

  const progress =
    selected.targetValue === null
      ? null
      : targetProgress(selected.bestValue, selected.targetValue, first?.value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Progress</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Track how a record has changed over time
        </p>
      </div>

      <ProgressPicker
        records={records.map((r) => ({ id: r.id, name: r.name }))}
        selectedId={selectedId}
      />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{selected.name}</CardTitle>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline">{TYPE_LABELS[selected.type]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {DIRECTION_LABELS[direction]}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums">
                {formatValue(selected.bestValue, selected.unit)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(selected.achievedAt)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressChart
            points={selected.attempts.map((a) => ({
              value: a.value,
              date: a.date,
              isBest: a.isBest,
              estimatedOneRep: a.estimatedOneRep,
            }))}
            unit={selected.unit}
            direction={direction}
            bestValue={selected.bestValue}
            target={selected.targetValue}
            height={280}
          />

          {progress && (
            <div className="space-y-1.5 rounded-lg border border-border px-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Target {formatValue(selected.targetValue!, selected.unit)}
                  {selected.targetDate
                    ? ` by ${formatDate(selected.targetDate)}`
                    : ""}
                </span>
                <span className="font-medium">
                  {progress.achieved
                    ? "Reached"
                    : `${formatValue(progress.remaining, selected.unit)} to go`}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>
              {selected.attempts.length}{" "}
              {selected.attempts.length === 1 ? "entry" : "entries"} since{" "}
              {first ? formatDate(first.date) : "—"}
            </span>
            {change > 0 && (
              <span>
                <span className="font-semibold text-foreground">
                  +{formatValue(change, selected.unit)}
                </span>{" "}
                improvement
              </span>
            )}
          </div>

          <Button asChild variant="outline" size="sm">
            <Link
              href={`/personal-bests/${selected.id}`}
              transitionTypes={["nav-forward"]}
            >
              Open record →
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
