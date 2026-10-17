import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { findPlannedDay, isRestDay, parsePlan } from "@/lib/session";
import { runnerExercisesFor } from "@/lib/session-service";
import { SessionRunner } from "@/components/session/session-runner";

export const metadata: Metadata = { title: "Workout — PR Tracker" };

type RouteContext = { params: Promise<{ id: string }> };

export default async function SessionPage({ params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tz = (user as SessionUser).timezone || "Asia/Jakarta";

  const { id } = await params;
  const [session, planRow] = await Promise.all([
    prisma.workoutSession.findFirst({
      where: { id, userId: user.id },
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
  if (!session) notFound();

  const plan = planRow ? parsePlan(planRow.planJson) : null;
  const planDay = session.planDay && plan ? findPlannedDay(plan, session.planDay) : null;
  const exercises = await runnerExercisesFor(user.id, session.exercises);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {session.sessionType ?? session.planDay ?? "Workout"}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {session.date.toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: tz,
            })}
            {session.completedAt ? " · finished" : " · in progress"}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/today">Today</Link>
        </Button>
      </div>

      <SessionRunner
        session={{
          id: session.id,
          notes: session.notes,
          sessionType: session.sessionType,
          completedAt: session.completedAt?.toISOString() ?? null,
        }}
        exercises={exercises}
        plan={
          planDay && !isRestDay(planDay)
            ? {
                warmUp: planDay.warmUp ?? [],
                cooldown: planDay.cooldown ?? [],
                notes: plan?.notes ?? "",
              }
            : null
        }
      />
    </div>
  );
}
