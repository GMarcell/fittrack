import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import {
  muscleCoverage,
  sessionTonnage,
  weekKeyInTimezone,
  weeklyAdherence,
} from "@/lib/session";
import { MUSCLE_GROUP_LABELS } from "@/lib/muscle-groups";
import { formatDate } from "@/lib/personal-best";

export const metadata: Metadata = { title: "Workouts — PR Tracker" };

export default async function WorkoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tz = (user as SessionUser).timezone || "Asia/Jakarta";

  const [sessions, planRow] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { date: "desc" },
      take: 100,
      include: {
        exercises: {
          include: { sets: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { planJson: true },
    }),
  ]);

  const workoutRows = sessions.map((session) => {
    const setCount = session.exercises.reduce((n, ex) => n + ex.sets.length, 0);
    const coverage = muscleCoverage(session.exercises).slice(0, 4);
    return {
      id: session.id,
      date: session.date,
      sessionType: session.sessionType ?? session.planDay ?? "Workout",
      setCount,
      tonnage: sessionTonnage(session.exercises),
      coverage,
    };
  });

  const now = new Date();
  const currentWeek = weekKeyInTimezone(now, tz);
  const weeks: { key: string; label: string; sessions: typeof workoutRows }[] = [];
  for (const row of workoutRows) {
    const key = weekKeyInTimezone(row.date, tz);
    let week = weeks.find((w) => w.key === key);
    if (!week) {
      const monday = new Date(`${key}T00:00:00Z`);
      week = {
        key,
        label:
          key === currentWeek ? "This week" : `Week of ${formatDate(monday)}`,
        sessions: [],
      };
      weeks.push(week);
    }
    week.sessions.push(row);
  }

  let adherence = { planned: 0, completed: 0, percent: 0 };
  if (planRow) {
    try {
      const plan = JSON.parse(planRow.planJson) as Parameters<typeof weeklyAdherence>[1];
      const result = weeklyAdherence(sessions, plan, now, tz);
      adherence = { planned: result.planned, completed: result.completed, percent: result.percent };
    } catch {
      adherence = { planned: 0, completed: 0, percent: 0 };
    }
  }

  const totalTonnage = workoutRows.reduce((n, w) => n + w.tonnage, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Workouts</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Every session you finished, newest first
          </p>
        </div>
        <Link
          href="/exercises"
          className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Exercise charts →
        </Link>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-2xl">🗓</p>
            <p className="mt-2 text-sm text-muted-foreground">
              No finished sessions yet. Start today&apos;s workout and it will show up here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/today">Go to today&apos;s session</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">Sessions</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">{sessions.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">Sets</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">
                  {workoutRows.reduce((n, w) => n + w.setCount, 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">Tonnage</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">
                  {totalTonnage > 0 ? `${Math.round(totalTonnage).toLocaleString("en-GB")} kg` : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          {adherence.planned > 0 && (
            <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
              This week: <span className="font-medium text-foreground">{adherence.completed}</span>{" "}
              of {adherence.planned} planned sessions done ({adherence.percent}%).
            </p>
          )}

          {weeks.map((week) => (
            <div key={week.key} className="space-y-2">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {week.label}
              </h2>
              {week.sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/workouts/${session.id}`}
                  className="block rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{session.sessionType}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {session.date.toLocaleDateString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          timeZone: tz,
                        })}{" "}
                        · {session.setCount} {session.setCount === 1 ? "set" : "sets"}
                        {session.tonnage > 0
                          ? ` · ${Math.round(session.tonnage).toLocaleString("en-GB")} kg`
                          : ""}
                      </p>
                      {session.coverage.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {session.coverage.map((c) => (
                            <Badge
                              key={c.group}
                              variant="outline"
                              className="text-[10px] capitalize"
                            >
                              {MUSCLE_GROUP_LABELS[c.group]} · {c.sets}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">→</span>
                  </div>
                </Link>
              ))}
            </div>
          ))}

          <p className="text-center text-xs text-muted-foreground">
            Showing your last {sessions.length} finished sessions.
          </p>
        </>
      )}
    </div>
  );
}
