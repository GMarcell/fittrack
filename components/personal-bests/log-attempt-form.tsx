"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  UNIT_LABELS,
  estimateOneRepMax,
  formatValue,
  supportsReps,
  toDateInputValue,
  type Direction,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";

export function LogAttemptForm({
  personalBestId,
  direction,
  unit,
  bestValue,
}: {
  personalBestId: string;
  direction: Direction;
  unit: PersonalBestUnitValue;
  bestValue: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [reps, setReps] = useState("");
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const wantReps = supportsReps(unit);
  const preview =
    wantReps && value && reps
      ? estimateOneRepMax(Number(value), Number(reps))
      : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = Number(value);
    if (!value.trim() || !Number.isFinite(parsed)) {
      setError("Enter a number.");
      return;
    }

    if (reps && (!Number.isInteger(Number(reps)) || Number(reps) < 1)) {
      setError("Reps must be a whole number.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/personal-bests/${personalBestId}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: parsed,
          date: new Date(date),
          reps: reps ? Number(reps) : undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          typeof data.error === "string"
            ? data.error
            : "Could not log this entry.",
        );
        setSaving(false);
        return;
      }

      const data = (await res.json()) as {
        isPersonalBest?: boolean;
        previousValue?: number | null;
      };

      setMessage(
        data.isPersonalBest
          ? data.previousValue === null
            ? `Record established — ${formatValue(parsed, unit)}.`
            : `New personal best — ${formatValue(parsed, unit)}!`
          : `Logged ${formatValue(parsed, unit)}.`,
      );
      setValue("");
      setReps("");
      setNotes("");
      setSaving(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <Button onClick={() => setOpen(true)} className="w-full">
          + Log new entry
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          {direction === "LATEST" ? "Current value" : "Current best"}:{" "}
          {formatValue(bestValue, unit)}
          {direction === "LATEST"
            ? ""
            : ` · ${direction === "LOWER" ? "lower" : "higher"} is better`}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={wantReps ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
        <div className="space-y-1.5">
          <Label htmlFor="attemptValue">Value ({UNIT_LABELS[unit]})</Label>
          <Input
            id="attemptValue"
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            autoFocus
            aria-invalid={Boolean(error)}
          />
        </div>

        {wantReps && (
          <div className="space-y-1.5">
            <Label htmlFor="attemptReps">Reps</Label>
            <Input
              id="attemptReps"
              type="number"
              min="1"
              max="100"
              inputMode="numeric"
              placeholder="optional"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="attemptDate">Date</Label>
          <Input
            id="attemptDate"
            type="date"
            value={date}
            max={toDateInputValue(new Date())}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {preview !== null && (
        <p className="text-xs text-muted-foreground">
          Estimated 1RM:{" "}
          <span className="font-medium text-foreground">
            {formatValue(preview, unit)}
          </span>{" "}
          ({reps} reps @ {formatValue(Number(value), unit)})
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="attemptNotes">Notes (optional)</Label>
        <Textarea
          id="attemptNotes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {message && <p className="text-xs text-primary">{message}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? "Saving…" : "Save entry"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(false);
            setError("");
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
