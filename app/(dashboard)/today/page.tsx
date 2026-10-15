import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import {
  dateKeyInTimezone,
  exercisesFromPlanDay,
  findPlannedDay,
  isRestDay,
  parsePlan,
  suggestNextStep,
  weekdayInTimezone,
} from "@/lib/session";
import { lastPerformanceFor } from "@/lib/session-service";
import { SessionRunner, type RunnerExercise } from "@/components/session/session-runner";
import { StartBlankSession } from "@/components/session/start-blank-session";

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
      where: { userId: user.id, completedAt: null, date: { gte: new Date(now.getTime() - 3 * 86400_000) } },
      include: { exercises: { include: { sets: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: { date: "desc" },
    }),
  ]);

  const session = openSessions.find((s) => dateKeyInTimezone(s.date, tz) === todayKey) ?? null;
  const plan = planRow ? parsePlan(planRow.planJson) : null;
  const plannedDay = plan ? findPlannedDay(plan, dayName) : null;
  const rest = plannedDay ? isRestDay(plannedDay) : false;

  // Nothing started yet — seed a session from today's plan slot.
  let activeSession = session;
  if (!activeSession && plannedDay && !rest) {
    activeSession = await prisma.workoutSession.create({
      data: {
        userId: user.id,
        date: now,
        planDay: plannedDay.day,
        sessionType: plannedDay.sessionType,
        exercises: {
          create: exercisesFromPlanDay(plannedDay).map((ex, i) => ({
            name: ex.exercise,
            muscleGroup: ex.muscleGroup ?? null,
            unit: "KG",
            targetSets: ex.sets,
            repTarget: ex.reps,
            rpeTarget: ex.rpe ?? null,
            sortOrder: i,
          })),
        },
      },
      include: { exercises: { include: { sets: true }, orderBy: { sortOrder: "asc" } } },
    });
  }

  const runnerExercises: RunnerExercise[] = await Promise.all(
    (activeSession?.exercises ?? []).map(async (ex) => {
      const last = await lastPerformanceFor(user.id, ex.name);
      const suggestion = last
        ? suggestNextStep(
            { weight: last.weight, reps: last.reps, rpe: last.rpe, date: last.date },
            ex.repTarget,
          )
        : null;
      return {
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        unit: ex.unit,
        targetSets: ex.targetSets,
        repTarget: ex.repTarget,
        rpeTarget: ex.rpeTarget,
        sets: ex.sets
          .slice()
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((s) => ({
            id: s.id,
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            rpe: s.rpe,
          })),
        suggestion: suggestion
          ? { weight: suggestion.weight, reps: suggestion.reps, note: suggestion.note }
          : null,
      };
    }),
  );

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
            plannedDay && !rest
              ? {
                  warmUp: plannedDay.warmUp ?? [],
                  cooldown: plannedDay.cooldown ?? [],
                  notes: plan?.notes ?? "",
                }
              : null
          }
        />
      )}
    </div>
  );
}
