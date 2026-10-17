import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressChart } from "@/components/personal-bests/progress-chart";
import { ExercisePicker } from "@/components/workouts/exercise-picker";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { collectExerciseProgress } from "@/lib/exercise-history";
import {
  UNIT_LABELS,
  formatDate,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";

export const metadata: Metadata = { title: "Exercise progress — PR Tracker" };

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { name } = await searchParams;
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id, completedAt: { not: null } },
    orderBy: { date: "desc" },
    take: 200,
    include: {
      exercises: {
        include: { sets: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const progress = collectExerciseProgress(
    sessions.flatMap((session) =>
      session.exercises.map((exercise) => ({
        name: exercise.name,
        unit: exercise.unit,
        date: session.date,
        sets: exercise.sets.map((set) => ({ weight: set.weight, reps: set.reps })),
      })),
    ),
  );

  if (progress.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Exercise progress</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-2xl">📈</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Finish a workout and every exercise you logged will get its own chart here.
            </p>
            <Button asChild className="mt-4">
              <Link href="/today">Start today&apos;s session</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selected =
    progress.find((exercise) => exercise.name.toLowerCase() === name?.toLowerCase()) ??
    progress[0];

  const chartUnit: PersonalBestUnitValue =
    selected.unit === "KG" || selected.unit === "LB" ? selected.unit : "REPS";
  const unitLabel = UNIT_LABELS[chartUnit];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Exercise progress</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your top set each session, for every exercise you actually train
        </p>
      </div>

      <ExercisePicker
        exercises={progress.map((exercise) => ({
          name: exercise.name,
          sessions: exercise.sessions,
        }))}
        selectedName={selected.name}
      />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{selected.name}</CardTitle>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline">
                  {chartUnit === "REPS" ? "Bodyweight / reps" : unitLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {selected.sessions} {selected.sessions === 1 ? "session" : "sessions"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums">
                {selected.bestValue.toLocaleString("en-GB")} {unitLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                best · {formatDate(selected.bestDate)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressChart
            points={selected.points.map((point) => ({
              value: point.value,
              date: point.date,
            }))}
            unit={chartUnit}
            direction="HIGHER"
            bestValue={selected.bestValue}
            height={280}
          />

          <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Last trained {formatDate(selected.lastDate)}</span>
            <Link href="/workouts" className="underline">
              See workout history →
            </Link>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        The point is the heaviest set of that exercise in a session (or the most reps for
        bodyweight work), so a hard set never gets hidden by a warm-up.
      </p>
    </div>
  );
}
