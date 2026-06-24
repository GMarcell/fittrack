"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActivityType = { id: string; name: string };
type Goal = { id: string; name: string };
type Exercise = { id: string; name: string; unit: string };
type SessionExerciseEntry = {
  exerciseId: string;
  sets?: number;
  reps?: number;
  value?: number;
};

type Props = {
  activityTypes: ActivityType[];
  goals: Goal[];
  exercises: Exercise[];
};

type StatBoost = { type: string; value: number };

const STAT_OPTIONS = [
  { value: "STR", label: "Strength" },
  { value: "END", label: "Endurance" },
  { value: "AGI", label: "Agility" },
  { value: "SPD", label: "Speed" },
  { value: "PWR", label: "Power" },
  { value: "FLX", label: "Flexibility" },
  { value: "VIT", label: "Vitality" },
  { value: "DSC", label: "Discipline" },
];

const INTENSITY_OPTIONS = [
  { value: 1, label: "Light (+1)" },
  { value: 2, label: "Moderate (+2)" },
  { value: 3, label: "Hard (+3)" },
];

export function NewSessionForm({ activityTypes, goals, exercises }: Props) {
  const router = useRouter();
  const [activityTypeId, setActivityTypeId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [focus, setFocus] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionExercises, setSessionExercises] = useState<
    SessionExerciseEntry[]
  >([]);
  const [statBoosts, setStatBoosts] = useState<StatBoost[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function addExercise() {
    setSessionExercises((prev) => [...prev, { exerciseId: "" }]);
  }

  function removeExercise(index: number) {
    setSessionExercises((prev) => prev.filter((_, i) => i !== index));
  }

  function addStatBoost() {
    if (statBoosts.length >= 2) return;
    setStatBoosts((prev) => [...prev, { type: "STR", value: 1 }]);
  }

  function removeStatBoost(index: number) {
    setStatBoosts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStatBoost(
    index: number,
    field: keyof StatBoost,
    value: string | number,
  ) {
    setStatBoosts((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    );
  }

  function updateExercise(
    index: number,
    field: keyof SessionExerciseEntry,
    value: string,
  ) {
    setSessionExercises((prev) =>
      prev.map((ex, i) =>
        i === index
          ? {
              ...ex,
              [field]:
                field === "exerciseId" ? value : Number(value) || undefined,
            }
          : ex,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activityTypeId) return setError("Activity type is required");
    setLoading(true);
    setError("");

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        activityTypeId,
        goalId: goalId || undefined,
        focus: focus || undefined,
        duration: duration ? Number(duration) : undefined,
        rpe: rpe ? Number(rpe) : undefined,
        notes: notes || undefined,
        sessionExercises: sessionExercises.filter((ex) => ex.exerciseId),
        statBoosts: statBoosts.length > 0 ? statBoosts : undefined,
      }),
    });

    if (!res.ok) {
      setError("Failed to log session. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/sessions");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Date */}
      <div className="space-y-1">
        <Label>Date</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Activity Type */}
      <div className="space-y-1">
        <Label>Activity Type</Label>
        <Select onValueChange={setActivityTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="Select activity type" />
          </SelectTrigger>
          <SelectContent>
            {activityTypes.map((at) => (
              <SelectItem key={at.id} value={at.id}>
                {at.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Goal (optional) */}
      <div className="space-y-1">
        <Label>Goal (optional)</Label>
        <Select onValueChange={setGoalId}>
          <SelectTrigger>
            <SelectValue placeholder="Link to a goal" />
          </SelectTrigger>
          <SelectContent>
            {goals.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Focus */}
      <div className="space-y-1">
        <Label>Focus (optional)</Label>
        <Input
          placeholder="e.g. Scrum practice, Easy run"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
        />
      </div>

      {/* Duration + RPE */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Duration (min)</Label>
          <Input
            type="number"
            placeholder="60"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>RPE (1–10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            placeholder="7"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
          />
        </div>
      </div>

      {/* Stat Boosts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Stat Boost (optional, max 2)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStatBoost}
            disabled={statBoosts.length >= 2}
          >
            + Add Boost
          </Button>
        </div>

        {statBoosts.map((boost, index) => (
          <Card key={index}>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Stat</Label>
                  <Select
                    value={boost.type}
                    onValueChange={(val) => updateStatBoost(index, "type", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAT_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Intensity</Label>
                  <Select
                    value={String(boost.value)}
                    onValueChange={(val) =>
                      updateStatBoost(index, "value", Number(val))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTENSITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={String(o.value)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => removeStatBoost(index)}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label>Notes (optional)</Label>
        <Textarea
          placeholder="How did it go?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Exercises */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Exercises (optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addExercise}
          >
            + Add Exercise
          </Button>
        </div>

        {sessionExercises.map((ex, index) => (
          <Card key={index}>
            <CardContent className="pt-4 space-y-3">
              <Select
                onValueChange={(val) =>
                  updateExercise(index, "exerciseId", val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select exercise" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Sets</Label>
                  <Input
                    type="number"
                    placeholder="3"
                    onChange={(e) =>
                      updateExercise(index, "sets", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reps</Label>
                  <Input
                    type="number"
                    placeholder="10"
                    onChange={(e) =>
                      updateExercise(index, "reps", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Value</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    onChange={(e) =>
                      updateExercise(index, "value", e.target.value)
                    }
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => removeExercise(index)}
              >
                Remove
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Logging..." : "Log Session"}
      </Button>
    </form>
  );
}
