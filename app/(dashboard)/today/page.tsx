import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import {
  dateKeyInTimezone,
  findPlannedDay,
  isRestDay,
  missedPlanDays,
  parsePlan,
  weekdayInTimezone,
} from "@/lib/session";
import { runnerExercisesFor } from "@/lib/session-service";
import { SessionRunner } from "@/components/session/session-runner";
import { StartBlankSession } from "@/components/session/start-blank-session";
import { StartPlannedSession } from "@/components/session/start-planned-session";
import { DiscardSessionButton } from "@/components/session/discard-session-button";

export const metadata: Metadata = { title: "Today — PR Tracker" };

export default async function TodayPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tz = (user as SessionUser).timezone || "Asia/Jakarta";

  const now = new Date();
  const todayKey = dateKeyInTimezone(now, tz);
  const dayName = weekdayInTimezone(now, tz);

  const [planRow, openSessions] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { planJson: true },
    }),
    prisma.workoutSession.findMany({
      where: { userId: user.id, completedAt: null },
      include: { exercises: { include: { sets: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  const session = openSessions.find((s) => dateKeyInTimezone(s.date, tz) === todayKey) ?? null;
  const staleSessions = openSessions.filter(
    (s) => dateKeyInTimezone(s.date, tz) !== todayKey,
  );
  const plan = planRow ? parsePlan(planRow.planJson) : null;
  const plannedDay = plan ? findPlannedDay(plan, dayName) : null;
  const rest = plannedDay ? isRestDay(plannedDay) : false;
  const missedDays = missedPlanDays(plan, openSessions, now, tz);

  const activeSession = session;

  const runnerExercises = await runnerExercisesFor(
    user.id,
    activeSession?.exercises ?? [],
  );

  // The plan slot this session actually belongs to, so a caught-up session
  // still shows its own warm-up and cooldown.
  const activePlanDay = activeSession?.planDay
    ? findPlannedDay(plan ?? { weeklySchedule: [] }, activeSession.planDay)
    : plannedDay && !rest
      ? plannedDay
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {dayName} — {plannedDay ? plannedDay.sessionType : "no planned session"}
        </p>
      </div>

      {!plan && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              You don&apos;t have a training plan yet. Complete onboarding to get one.
            </p>
            <Button asChild className="mt-4">
              <Link href="/onboarding">Go to onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {plan && (!plannedDay || rest) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span>😌</span> {plannedDay ? "Rest day" : "Nothing planned today"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {plannedDay
                ? "Today is a recovery day in your plan. Light walking, stretching and protein are the assignment."
                : "Your plan has no session for this day. You can log an ad-hoc workout if you trained anyway."}
            </p>
            <StartBlankSession date={todayKey} />
          </CardContent>
        </Card>
      )}

      {plan && plannedDay && !rest && !activeSession && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">Today: {plannedDay.sessionType}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              {plannedDay.mainWorkout.length} exercises planned
              {plannedDay.warmUp && plannedDay.warmUp.length > 0
                ? ` · warm-up: ${plannedDay.warmUp.join(", ")}`
                : ""}
            </p>
            <StartPlannedSession planDay={plannedDay} />
          </CardContent>
        </Card>
      )}

      {!activeSession && plan && missedDays.length > 0 && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">
              Missed {missedDays[0].day}?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              You never started {missedDays[0].day}’s session ({missedDays[0].sessionType}).
              You can still train it today — it will log against {missedDays[0].day}’s slot.
              {missedDays.length > 1
                ? ` ${missedDays.length - 1} older ${missedDays.length - 1 === 1 ? "session is" : "sessions are"} also outstanding.`
                : ""}
            </p>
            <StartPlannedSession
              planDay={missedDays[0]}
              label={`Train ${missedDays[0].day} today`}
            />
          </CardContent>
        </Card>
      )}

      {staleSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unfinished sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              These were started but never finished. Pick one back up or discard it.
            </p>
            {staleSessions.map((stale) => {
              const sets = stale.exercises.reduce((n, ex) => n + ex.sets.length, 0);
              return (
                <div
                  key={stale.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {stale.sessionType ?? stale.planDay ?? "Workout"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stale.date.toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: tz,
                      })}{" "}
                      · {sets} {sets === 1 ? "set" : "sets"} logged
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      href={`/sessions/${stale.id}`}
                      className="text-xs font-medium underline"
                    >
                      Resume
                    </Link>
                    <DiscardSessionButton sessionId={stale.id} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {activeSession && (
        <SessionRunner
          session={{
            id: activeSession.id,
            notes: activeSession.notes,
            sessionType: activeSession.sessionType,
            completedAt: activeSession.completedAt?.toISOString() ?? null,
          }}
          exercises={runnerExercises}
          plan={
            activePlanDay
              ? {
                  warmUp: activePlanDay.warmUp ?? [],
                  cooldown: activePlanDay.cooldown ?? [],
                  notes: plan?.notes ?? "",
                }
              : null
          }
        />
      )}
    </div>
  );
}
