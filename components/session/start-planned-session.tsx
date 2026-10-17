"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { exercisesFromPlanDay, type PlanDay } from "@/lib/session";

export function StartPlannedSession({
  planDay,
  label,
  date,
}: {
  planDay: PlanDay;
  label?: string;
  /** ISO date; defaults to now (the session is trained today). */
  date?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date ?? new Date().toISOString(),
          planDay: planDay.day,
          sessionType: planDay.sessionType,
          exercises: exercisesFromPlanDay(planDay).map((exercise) => ({
            name: exercise.exercise,
            muscleGroup: exercise.muscleGroup ?? null,
            unit: "KG",
            targetSets: exercise.sets,
            repTarget: exercise.reps,
            rpeTarget: exercise.rpe ?? null,
          })),
        }),
      });

      const body = (await res.json().catch(() => null)) as {
        session?: { id: string };
        error?: unknown;
      } | null;
      if (!res.ok || !body?.session) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Could not start that session",
        );
      }

      router.push(`/sessions/${body.session.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start that session");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={start} disabled={loading} size="sm">
        {loading ? "Starting…" : (label ?? `Start ${planDay.sessionType}`)}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
