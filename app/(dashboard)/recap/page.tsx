import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import {
  sessionTonnage,
  shiftWeekKey,
  weekKeyInTimezone,
} from "@/lib/session";
import { MUSCLE_GROUP_LABELS } from "@/lib/muscle-groups";
import { muscleBalance } from "@/lib/recap";
import { formatDate } from "@/lib/personal-best";

export const metadata: Metadata = { title: "Weekly recap — PR Tracker" };

export default async function RecapPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tz = (user as SessionUser).timezone || "Asia/Jakarta";

  const now = new Date();
  const currentWeek = weekKeyInTimezone(now, tz);
  const previousWeek = shiftWeekKey(currentWeek, -1);
  const fourWeeksAgo = shiftWeekKey(currentWeek, -3);
  const weekStartDate = new Date(`${currentWeek}T00:00:00Z`);

  const [sessions, prs] = await Promise.all([
    prisma.workoutSession.findMany({
      where: {
        userId: user.id,
        completedAt: { not: null },
        date: { gte: new Date(`${fourWeeksAgo}T00:00:00Z`) },
      },
      orderBy: { date: "desc" },
      include: {
        exercises: {
          include: { sets: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.achievement.count({
      where: { userId: user.id, date: { gte: weekStartDate } },
    }),
  ]);

  const inWeek = (key: string) =>
    sessions.filter((session) => weekKeyInTimezone(session.date, tz) === key);

  const current = inWeek(currentWeek);
  const previous = inWeek(previousWeek);

  const setsIn = (rows: typeof sessions) =>
    rows.reduce(
      (total, session) =>
        total + session.exercises.reduce((n, exercise) => n + exercise.sets.length, 0),
      0,
    );

  const currentSets = setsIn(current);
  const currentTonnage = sessionTonnage(current.flatMap((session) => session.exercises));
  const previousTonnage = sessionTonnage(previous.flatMap((session) => session.exercises));
  const tonnageDelta =
    previousTonnage > 0
      ? Math.round(((currentTonnage - previousTonnage) / previousTonnage) * 100)
      : null;

  const balance = muscleBalance(sessions.flatMap((session) => session.exercises));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Weekly recap</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Week of {formatDate(new Date(`${currentWeek}T00:00:00Z`))} — what moved and
            what got missed
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/workouts">History</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{current.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Sets</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{currentSets}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Tonnage</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {currentTonnage > 0
                ? `${Math.round(currentTonnage).toLocaleString("en-GB")} kg`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">New PRs</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{prs}</p>
          </CardContent>
        </Card>
      </div>

      {tonnageDelta !== null && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          Tonnage is{" "}
          <span className={tonnageDelta >= 0 ? "font-medium text-primary" : "font-medium text-destructive"}>
            {tonnageDelta >= 0 ? "+" : ""}
            {tonnageDelta}%
          </span>{" "}
          versus last week ({Math.round(previousTonnage).toLocaleString("en-GB")} kg).
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Muscle balance · last 4 weeks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {balance.rows.map((row) => (
            <div key={row.group} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5">
                  {MUSCLE_GROUP_LABELS[row.group]}
                  {row.neglected && (
                    <Badge variant="outline" className="border-destructive/50 text-[9px] text-destructive">
                      neglected
                    </Badge>
                  )}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {row.sets} {row.sets === 1 ? "set" : "sets"}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    row.neglected
                      ? "h-full rounded-full bg-destructive/70"
                      : "h-full rounded-full bg-primary"
                  }
                  style={{ width: `${row.percentOfTop}%` }}
                />
              </div>
            </div>
          ))}

          {balance.neglected.length > 0 && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              No direct work for{" "}
              <span className="font-medium">
                {balance.neglected.map((group) => MUSCLE_GROUP_LABELS[group]).join(", ")}
              </span>{" "}
              in the last four weeks. Add a set or two unless that is intentional.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">This week&apos;s sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {current.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing finished this week yet.{" "}
              <Link href="/today" className="underline">
                Start today&apos;s session
              </Link>
              .
            </p>
          ) : (
            current.map((session) => {
              const sets = session.exercises.reduce((n, exercise) => n + exercise.sets.length, 0);
              return (
                <Link
                  key={session.id}
                  href={`/workouts/${session.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent/40"
                >
                  <span className="min-w-0 truncate">
                    {session.sessionType ?? session.planDay ?? "Workout"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {session.date.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      timeZone: tz,
                    })}{" "}
                    · {sets} {sets === 1 ? "set" : "sets"}
                  </span>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Balance counts working sets over the last four weeks. Cardio and full-body work
        are tracked but never flagged as neglected.
      </p>
    </div>
  );
}
