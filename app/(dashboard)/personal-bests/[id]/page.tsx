import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/personal-bests/progress-chart";
import { LogAttemptForm } from "@/components/personal-bests/log-attempt-form";
import { AttemptHistory } from "@/components/personal-bests/attempt-history";
import { PersonalBestActions } from "@/components/personal-bests/personal-best-actions";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  DIRECTION_LABELS,
  TYPE_LABELS,
  formatDate,
  formatRelativeDays,
  formatValue,
  targetProgress,
} from "@/lib/personal-best";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const user = await getCurrentUser();
  if (!user) return { title: "PR Tracker" };

  const { id } = await params;
  const record = await prisma.personalBest.findFirst({
    where: { id, userId: user.id },
    select: { name: true },
  });

  return { title: record ? `${record.name} — PR Tracker` : "PR Tracker" };
}

export default async function PersonalBestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const record = await prisma.personalBest.findFirst({
    where: { id, userId: user.id },
    include: {
      attempts: { orderBy: { date: "asc" } },
      achievements: { orderBy: { date: "desc" } },
    },
  });

  if (!record) notFound();

  const direction = record.direction;
  const attempts = [...record.attempts].reverse();
  const first = record.attempts[0];
  const improvement =
    first && record.attempts.length > 1 && direction !== "LATEST"
      ? direction === "LOWER"
        ? first.value - record.bestValue
        : record.bestValue - first.value
      : 0;

  const hasEstimates = record.attempts.some((a) => a.estimatedOneRep != null);

  const progress =
    record.targetValue === null
      ? null
      : targetProgress(record.bestValue, record.targetValue, first?.value);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{record.name}</h1>
          <Badge variant="outline">{TYPE_LABELS[record.type]}</Badge>
          {record.verified && <Badge variant="secondary">Verified</Badge>}
          {record.achievements.length > 0 && (
            <Badge variant="outline">
              {record.achievements.length} PR
              {record.achievements.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {direction === "LATEST" ? "Latest entry" : "Personal best"} ·{" "}
          {DIRECTION_LABELS[direction]} · {record.attempts.length}{" "}
          {record.attempts.length === 1 ? "entry" : "entries"} logged
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {direction === "LATEST" ? "Current value" : "Current best"}
              </p>
              <p className="text-3xl font-semibold tabular-nums">
                {formatValue(record.bestValue, record.unit)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Set {formatDate(record.achievedAt)} ·{" "}
                {formatRelativeDays(record.achievedAt)}
              </p>
            </div>
            {improvement > 0 && (
              <p className="text-right text-xs text-muted-foreground">
                <span className="text-base font-semibold text-foreground">
                  {formatValue(improvement, record.unit)}
                </span>
                <br />
                since first entry
              </p>
            )}
          </div>

          {progress && (
            <div className="space-y-1.5 border-t border-border pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Target {formatValue(record.targetValue!, record.unit)}
                  {record.targetDate ? ` by ${formatDate(record.targetDate)}` : ""}
                </span>
                <span className="font-medium">
                  {progress.achieved
                    ? "Reached 🎉"
                    : `${formatValue(progress.remaining, record.unit)} to go`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {record.notes && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          {record.notes}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart
            points={record.attempts.map((a) => ({
              value: a.value,
              date: a.date,
              isBest: a.isBest,
              estimatedOneRep: a.estimatedOneRep,
            }))}
            unit={record.unit}
            direction={direction}
            bestValue={record.bestValue}
            target={record.targetValue}
          />
          {hasEstimates && (
            <p className="mt-2 text-xs text-muted-foreground">
              Estimates use Epley&apos;s formula from the weight and reps of each
              entry.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log a new entry</CardTitle>
        </CardHeader>
        <CardContent>
          <LogAttemptForm
            personalBestId={record.id}
            direction={direction}
            unit={record.unit}
            bestValue={record.bestValue}
          />
        </CardContent>
      </Card>

      {record.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Record history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {record.achievements.map((achievement) => {
                const delta =
                  achievement.previousValue === null
                    ? null
                    : Math.round(
                        Math.abs(achievement.value - achievement.previousValue) *
                          100,
                      ) / 100;

                return (
                  <li
                    key={achievement.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium tabular-nums">
                        {formatValue(achievement.value, record.unit)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(achievement.date)} ·{" "}
                        {formatRelativeDays(achievement.date)}
                      </p>
                    </div>
                    {delta === null ? (
                      <Badge variant="outline">Established</Badge>
                    ) : (
                      <Badge variant="secondary">
                        +{formatValue(delta, record.unit)}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <AttemptHistory attempts={attempts} unit={record.unit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manage</CardTitle>
        </CardHeader>
        <CardContent>
          <PersonalBestActions
            personalBest={{
              id: record.id,
              name: record.name,
              type: record.type,
              unit: record.unit,
              direction,
              notes: record.notes,
              verified: record.verified,
              targetValue: record.targetValue,
              targetDate: record.targetDate,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
