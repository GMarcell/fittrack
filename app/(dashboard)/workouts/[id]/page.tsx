import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { muscleCoverage, sessionTonnage } from "@/lib/session";
import { MUSCLE_GROUP_LABELS } from "@/lib/muscle-groups";
import { formatDate } from "@/lib/personal-best";

export const metadata: Metadata = { title: "Workout — PR Tracker" };

type RouteContext = { params: Promise<{ id: string }> };

export default async function WorkoutDetailPage({ params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const tz = (user as SessionUser).timezone || "Asia/Jakarta";

  const { id } = await params;
  const session = await prisma.workoutSession.findFirst({
    where: { id, userId: user.id },
    include: {
      exercises: {
        include: { sets: { orderBy: { setNumber: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!session) notFound();

  const setCount = session.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const tonnage = sessionTonnage(session.exercises);
  const coverage = muscleCoverage(session.exercises);

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
              year: "numeric",
              timeZone: tz,
            })}
            {session.completedAt ? " · completed" : " · not finished"}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/workouts">Back</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Exercises</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {session.exercises.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Sets</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{setCount}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Tonnage</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">
              {tonnage > 0 ? `${Math.round(tonnage).toLocaleString("en-GB")} kg` : "Bodyweight"}
            </p>
          </CardContent>
        </Card>
      </div>

      {coverage.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {coverage.map((c) => (
            <Badge key={c.group} variant="outline" className="text-[11px]">
              <span className="capitalize">{MUSCLE_GROUP_LABELS[c.group]}</span>
              <span className="ml-1 text-muted-foreground">
                {c.sets} {c.sets === 1 ? "set" : "sets"}
                {c.tonnage > 0 ? ` · ${Math.round(c.tonnage).toLocaleString("en-GB")} kg` : ""}
              </span>
            </Badge>
          ))}
        </div>
      )}

      {session.exercises.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No exercises were logged in this session.
          </CardContent>
        </Card>
      ) : (
        session.exercises.map((exercise) => (
          <Card key={exercise.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    <Link
                      href={`/exercises?name=${encodeURIComponent(exercise.name)}`}
                      className="hover:underline"
                    >
                      {exercise.name}
                    </Link>
                  </CardTitle>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {exercise.muscleGroup && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {exercise.muscleGroup}
                      </Badge>
                    )}
                    {(exercise.targetSets || exercise.repTarget) && (
                      <span className="text-xs text-muted-foreground">
                        {exercise.targetSets ? `${exercise.targetSets} sets` : ""}
                        {exercise.repTarget ? ` × ${exercise.repTarget}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">Open progress →</span>
              </div>
            </CardHeader>
            <CardContent>
              {exercise.sets.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sets logged.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {exercise.sets.map((set) => (
                    <span
                      key={set.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs tabular-nums"
                    >
                      <span className="text-muted-foreground">{set.setNumber}</span>
                      {set.weight
                        ? `${set.weight}${exercise.unit?.toLowerCase() ?? ""} × `
                        : ""}
                      {set.reps}
                      {set.rpe ? ` @${set.rpe}` : ""}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {session.notes && (
        <Card>
          <CardContent className="py-4 text-sm">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Session notes</p>
            <p className="whitespace-pre-wrap">{session.notes}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Session from {formatDate(session.createdAt)}
      </p>
    </div>
  );
}
