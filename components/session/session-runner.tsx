"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { muscleCoverage, sessionTonnage } from "@/lib/session";
import { MUSCLE_GROUP_LABELS } from "@/lib/muscle-groups";
import {
  flushQueuedSets,
  isOfflineQueuedId,
  queueSet,
  queuedSetCount,
  removeQueuedSet,
  subscribeToQueue,
} from "@/lib/offline-queue";

export type RunnerSet = {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number;
  rpe: number | null;
};

export type RunnerExercise = {
  id: string;
  name: string;
  muscleGroup: string | null;
  unit: string | null;
  targetSets: number | null;
  repTarget: string | null;
  rpeTarget: string | null;
  sets: RunnerSet[];
  suggestion: { weight: number | null; reps: string; note: string } | null;
};

type SyncedResult = {
  name: string;
  logged: boolean;
  isPersonalBest: boolean;
  previousValue: number | null;
};

type SessionRunnerProps = {
  session: { id: string; notes: string | null; sessionType: string | null; completedAt: string | null };
  exercises: RunnerExercise[];
  plan: { warmUp: string[]; cooldown: string[]; notes: string } | null;
};

const REST_PRESETS = [60, 90, 120, 180];

function subscribeToConnection(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

function isCurrentlyOffline() {
  return typeof navigator === "undefined" ? false : !navigator.onLine;
}

function firstRepOf(repTarget: string | null): string {
  const nums = repTarget?.match(/\d+/);
  return nums ? nums[0] : "";
}

export function SessionRunner({ session, exercises, plan }: SessionRunnerProps) {
  const router = useRouter();
  const [list, setList] = useState<RunnerExercise[]>(exercises);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [completed, setCompleted] = useState(Boolean(session.completedAt));
  const [syncResults, setSyncResults] = useState<SyncedResult[] | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restSeconds, setRestSeconds] = useState(90);
  const [extraName, setExtraName] = useState("");
  const [adding, setAdding] = useState(false);
  const offline = useSyncExternalStore(
    subscribeToConnection,
    isCurrentlyOffline,
    () => false,
  );
  const queuedCount = useSyncExternalStore(
    subscribeToQueue,
    queuedSetCount,
    () => 0,
  );

  // Logging a set must work in a gym basement. Anything written while offline
  // lives in localStorage and is replayed when the connection returns.
  useEffect(() => {
    if (offline) return;
    let cancelled = false;
    void flushQueuedSets().then((result) => {
      if (!cancelled && result.synced > 0 && result.remaining === 0) router.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, [offline, router]);

  const totalSets = useMemo(
    () => list.reduce((n, ex) => n + ex.sets.length, 0),
    [list],
  );

  const recap = useMemo(
    () => ({
      tonnage: sessionTonnage(list),
      coverage: muscleCoverage(list),
    }),
    [list],
  );

  const personalBests = (syncResults ?? []).filter(
    (result) => result.logged && result.isPersonalBest,
  );

  async function api(path: string, init?: RequestInit) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ? JSON.stringify(body.error) : `Request failed (${res.status})`);
    }
    return res.json();
  }

  function addSetLocally(exerciseId: string, set: RunnerSet) {
    setList((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, sets: [...ex.sets, set] } : ex)),
    );
  }

  function removeSetLocally(exerciseId: string, setId: string) {
    setList((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
          : ex,
      ),
    );
  }

  function storeOffline(exerciseId: string, weight: number | null, reps: number, rpe: number | null) {
    const setNumber =
      (list.find((exercise) => exercise.id === exerciseId)?.sets.length ?? 0) + 1;
    const queued = queueSet({ sessionId: session.id, exerciseId, weight, reps, rpe });
    addSetLocally(exerciseId, {
      id: queued.id,
      setNumber,
      weight,
      reps,
      rpe,
    });
    setRestEndsAt(Date.now() + restSeconds * 1000);
  }

  async function handleAddSet(exerciseId: string, weight: number | null, reps: number, rpe: number | null) {
    setError(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      storeOffline(exerciseId, weight, reps, rpe);
      return;
    }

    try {
      const { set } = await api(`/api/sessions/${session.id}/sets`, {
        method: "POST",
        body: JSON.stringify({ exerciseId, weight, reps, rpe }),
      });
      addSetLocally(exerciseId, {
        id: set.id,
        setNumber: set.setNumber,
        weight: set.weight,
        reps: set.reps,
        rpe: set.rpe,
      });
      setRestEndsAt(Date.now() + restSeconds * 1000);
    } catch (e) {
      if (e instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine)) {
        storeOffline(exerciseId, weight, reps, rpe);
        return;
      }
      setError(e instanceof Error ? e.message : "Could not log set");
    }
  }

  async function handleRemoveSet(exerciseId: string, setId: string) {
    setError(null);

    if (isOfflineQueuedId(setId)) {
      removeQueuedSet(setId);
      removeSetLocally(exerciseId, setId);
      return;
    }

    try {
      await api(`/api/sessions/${session.id}/sets/${setId}`, { method: "DELETE" });
      removeSetLocally(exerciseId, setId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete set");
    }
  }

  async function handleUnitChange(exerciseId: string, unit: string | null) {
    setList((prev) => prev.map((ex) => (ex.id === exerciseId ? { ...ex, unit } : ex)));
    try {
      await api(`/api/sessions/${session.id}/exercises/${exerciseId}`, {
        method: "PATCH",
        body: JSON.stringify({ unit }),
      });
    } catch {
      /* optimistic; refresh will resync */
      router.refresh();
    }
  }

  async function handleRemoveExercise(exerciseId: string) {
    setList((prev) => prev.filter((ex) => ex.id !== exerciseId));
    try {
      await api(`/api/sessions/${session.id}/exercises/${exerciseId}`, { method: "DELETE" });
    } catch {
      router.refresh();
    }
  }

  async function handleAddExercise() {
    const name = extraName.trim();
    if (!name) return;
    setAdding(true);
    setError(null);
    try {
      const { exercise } = await api(`/api/sessions/${session.id}/exercises`, {
        method: "POST",
        body: JSON.stringify({ name, unit: "KG" }),
      });
      setList((prev) => [
        ...prev,
        {
          id: exercise.id,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          unit: exercise.unit,
          targetSets: exercise.targetSets,
          repTarget: exercise.repTarget,
          rpeTarget: exercise.rpeTarget,
          sets: [],
          suggestion: null,
        },
      ]);
      setExtraName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add exercise");
    } finally {
      setAdding(false);
    }
  }

  async function handleFinish() {
    setFinishing(true);
    setError(null);
    try {
      if (notes.trim() !== (session.notes ?? "")) {
        await api(`/api/sessions/${session.id}`, {
          method: "PATCH",
          body: JSON.stringify({ notes: notes.trim() || null }),
        });
      }
      const { synced } = await api(`/api/sessions/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({ complete: true }),
      });
      setSyncResults(synced);
      setCompleted(true);
      router.refresh();
    } catch (e) {
      setError(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "You're offline — reconnect to finish and save this session."
          : e instanceof Error
            ? e.message
            : "Could not finish session",
      );
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="space-y-4">
      {plan && (plan.warmUp.length > 0 || plan.cooldown.length > 0) && (
        <Card>
          <CardContent className="py-3 text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">Warm-up:</span> {plan.warmUp.join(", ") || "—"}</p>
            <p><span className="font-medium text-foreground">Cool-down:</span> {plan.cooldown.join(", ") || "—"}</p>
            {plan.notes && <p className="pt-1 italic">“{plan.notes}”</p>}
          </CardContent>
        </Card>
      )}

      {(offline || queuedCount > 0) && !completed && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
          {offline
            ? "Offline — sets are saved on this device and sync when you reconnect."
            : `${queuedCount} ${queuedCount === 1 ? "set" : "sets"} waiting to sync…`}
        </div>
      )}

      <RestTimer
        endsAt={restEndsAt}
        onEnd={() => setRestEndsAt(null)}
        seconds={restSeconds}
        setSeconds={setRestSeconds}
        presets={REST_PRESETS}
        disabled={completed}
      />

      {list.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          completed={completed}
          onAddSet={handleAddSet}
          onRemoveSet={handleRemoveSet}
          onUnitChange={handleUnitChange}
          onRemove={() => handleRemoveExercise(ex.id)}
        />
      ))}

      {list.length === 0 && !completed && (
        <p className="text-sm text-muted-foreground">
          This session has no exercises yet — add one below.
        </p>
      )}

      {!completed && (
        <Card>
          <CardContent className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                value={extraName}
                onChange={(e) => setExtraName(e.target.value)}
                placeholder="Add an exercise not in the plan…"
                onKeyDown={(e) => e.key === "Enter" && handleAddExercise()}
              />
              <Button variant="outline" size="sm" onClick={handleAddExercise} disabled={adding}>
                Add
              </Button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session notes (how did it feel?)"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-20"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{totalSets} sets logged</span>
              <Button onClick={handleFinish} disabled={finishing}>
                {finishing ? "Finishing…" : "Finish session"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {completed && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base">🎉 Session complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-border py-2">
                <p className="text-lg font-semibold tabular-nums">{totalSets}</p>
                <p className="text-[11px] text-muted-foreground">
                  {totalSets === 1 ? "set" : "sets"}
                </p>
              </div>
              <div className="rounded-lg border border-border py-2">
                <p className="text-lg font-semibold tabular-nums">
                  {recap.tonnage > 0
                    ? Math.round(recap.tonnage).toLocaleString("en-GB")
                    : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {recap.tonnage > 0 ? "kg lifted" : "bodyweight work"}
                </p>
              </div>
              <div className="rounded-lg border border-border py-2">
                <p className="text-lg font-semibold tabular-nums">
                  {syncResults ? personalBests.length : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {personalBests.length === 1 ? "new PR" : "new PRs"}
                </p>
              </div>
            </div>

            {recap.coverage.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {recap.coverage.map((c) => (
                  <Badge key={c.group} variant="outline" className="text-[10px]">
                    {MUSCLE_GROUP_LABELS[c.group]} · {c.sets}
                  </Badge>
                ))}
              </div>
            )}

            {personalBests.length > 0 ? (
              <div className="space-y-1">
                {personalBests.map((s) => (
                  <p key={s.name}>
                    <span className="font-medium text-primary">New PR: {s.name}</span>
                    {s.previousValue !== null && (
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        (previous {s.previousValue})
                      </span>
                    )}
                  </p>
                ))}
              </div>
            ) : syncResults ? (
              <p className="text-muted-foreground">
                Logged into your history. No record was beaten this time — the work still counts.
              </p>
            ) : (
              <p className="text-muted-foreground">
                This session is in your history. The volume above is what you actually did.
              </p>
            )}

            <p className="rounded-lg bg-accent/60 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Next time: </span>
              {personalBests.length > 0
                ? "progress the load on the lifts that moved, and keep the rest steady."
                : "match this session, then add a rep or a little weight to one exercise."}
            </p>

            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push("/workouts")}>
                View history
              </Button>
              <Button size="sm" className="flex-1" onClick={() => router.push("/")}>
                Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Best-effort beep + haptic when the rest countdown reaches zero. */
function signalRestEnd(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;

  try {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtor) {
      const ctx = new AudioCtor();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.55);
      window.setTimeout(() => void ctx.close().catch(() => {}), 700);
    }
  } catch {
    // Audio can be blocked by the browser; the timer still ends normally.
  }

  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Vibration is not available on most desktops.
  }
}

function RestTimer({
  endsAt,
  onEnd,
  seconds,
  setSeconds,
  presets,
  disabled,
}: {
  endsAt: number | null;
  onEnd: () => void;
  seconds: number;
  setSeconds: (n: number) => void;
  presets: number[];
  disabled: boolean;
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [sound, setSound] = useState(true);
  const endedRef = useRef(false);

  useEffect(() => {
    if (endsAt === null) return;
    endedRef.current = false;
    const t = setInterval(() => {
      setNowMs(Date.now());
      if (Date.now() >= endsAt && !endedRef.current) {
        endedRef.current = true;
        clearInterval(t);
        signalRestEnd(sound);
        onEnd();
      }
    }, 500);
    return () => clearInterval(t);
  }, [endsAt, onEnd, sound]);

  if (disabled) return null;

  // Before the first tick the countdown still reads correctly as the duration
  // that was just chosen, since the parent set endsAt from it moments earlier.
  const remaining =
    endsAt !== null && nowMs !== null ? Math.max(0, Math.ceil((endsAt - nowMs) / 1000)) : seconds;

  return (
    <div className="sticky top-[56px] z-30 flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 backdrop-blur">
      <span className="text-xs font-medium text-muted-foreground">Rest</span>
      {presets.map((p) => (
        <button
          key={p}
          onClick={() => setSeconds(p)}
          className={cn(
            "rounded px-2 py-0.5 text-xs border transition-colors",
            seconds === p
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {p}s
        </button>
      ))}
      <button
        type="button"
        onClick={() => setSound((current) => !current)}
        aria-label={sound ? "Mute rest alert" : "Enable rest alert"}
        title={sound ? "Sound on" : "Sound off"}
        className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {sound ? "🔔" : "🔇"}
      </button>
      {endsAt !== null ? (
        <span className="ml-auto tabular-nums text-sm font-semibold">
          {remaining}s ⏱
          <button onClick={onEnd} className="ml-2 text-xs font-normal text-muted-foreground underline">
            skip
          </button>
        </span>
      ) : (
        <span className="ml-auto text-xs text-muted-foreground">timer starts when you log a set</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ExerciseCard({
  exercise,
  completed,
  onAddSet,
  onRemoveSet,
  onUnitChange,
  onRemove,
}: {
  exercise: RunnerExercise;
  completed: boolean;
  onAddSet: (exerciseId: string, weight: number | null, reps: number, rpe: number | null) => Promise<void>;
  onRemoveSet: (exerciseId: string, setId: string) => Promise<void>;
  onUnitChange: (exerciseId: string, unit: string | null) => Promise<void>;
  onRemove: () => void;
}) {
  const [weight, setWeight] = useState(
    exercise.suggestion?.weight != null ? String(exercise.suggestion.weight) : "",
  );
  const [reps, setReps] = useState(firstRepOf(exercise.repTarget));
  const [rpe, setRpe] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const repsNum = parseInt(reps, 10);
    if (!Number.isFinite(repsNum) || repsNum < 0) return;
    setBusy(true);
    const weightNum = weight.trim() === "" || exercise.unit === null ? null : parseFloat(weight);
    const rpeNum = rpe.trim() === "" ? null : parseFloat(rpe);
    await onAddSet(
      exercise.id,
      weightNum !== null && Number.isFinite(weightNum) ? weightNum : null,
      repsNum,
      rpeNum !== null && Number.isFinite(rpeNum) ? rpeNum : null,
    );
    setBusy(false);
  }

  const targetLabel = [
    exercise.targetSets ? `${exercise.targetSets} sets` : null,
    exercise.repTarget ? `× ${exercise.repTarget}` : null,
    exercise.rpeTarget ? `@${exercise.rpeTarget}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{exercise.name}</CardTitle>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              {exercise.muscleGroup && (
                <Badge variant="outline" className="capitalize text-[10px]">
                  {exercise.muscleGroup}
                </Badge>
              )}
              {targetLabel && (
                <span className="text-xs text-muted-foreground">{targetLabel}</span>
              )}
            </div>
          </div>
          {!completed && (
            <button
              onClick={onRemove}
              className="text-xs text-muted-foreground hover:text-destructive"
              title="Remove exercise"
            >
              ✕
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {exercise.suggestion && (
          <p className="text-xs rounded-md bg-accent/60 px-2.5 py-1.5 text-muted-foreground">
            💡 {exercise.suggestion.note}
          </p>
        )}

        {exercise.sets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {exercise.sets.map((s) => (
              <span
                key={s.id}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs tabular-nums"
              >
                <span className="text-muted-foreground">{s.setNumber}</span>
                {s.weight ? `${s.weight}${exercise.unit?.toLowerCase() ?? ""} × ` : ""}
                {s.reps}
                {s.rpe ? ` @${s.rpe}` : ""}
                {!completed && (
                  <button
                    onClick={() => onRemoveSet(exercise.id, s.id)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete set"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {!completed && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <button
                onClick={() => onUnitChange(exercise.id, exercise.unit === "KG" ? null : exercise.unit === null ? "LB" : "KG")}
                className="rounded border border-border px-2 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground min-w-12"
                title="Cycle weight unit: KG → off → LB"
              >
                {exercise.unit ?? "BW"}
              </button>
            </div>
            {exercise.unit && (
              <Input
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                inputMode="decimal"
                placeholder={exercise.unit.toLowerCase()}
                className="w-16"
              />
            )}
            <Input
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              inputMode="numeric"
              placeholder="reps"
              className="w-16"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Input
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              inputMode="decimal"
              placeholder="rpe"
              className="w-14"
            />
            <Button size="sm" variant="outline" onClick={submit} disabled={busy}>
              + Set
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
