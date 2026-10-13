"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DIRECTION_LABELS,
  SCORING_OPTIONS,
  UNIT_LABELS,
  toDateInputValue,
  unitsFor,
  type Direction,
  type PersonalBestTypeValue,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";

export function PersonalBestActions({
  personalBest,
}: {
  personalBest: {
    id: string;
    name: string;
    type: PersonalBestTypeValue;
    unit: PersonalBestUnitValue;
    direction: Direction;
    notes: string | null;
    verified: boolean;
    targetValue: number | null;
    targetDate: Date | string | null;
  };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(personalBest.name);
  const [unit, setUnit] = useState<PersonalBestUnitValue>(personalBest.unit);
  const [direction, setDirection] = useState<Direction>(
    personalBest.direction,
  );
  const [notes, setNotes] = useState(personalBest.notes ?? "");
  const [verified, setVerified] = useState(personalBest.verified);
  const [targetValue, setTargetValue] = useState(
    personalBest.targetValue === null ? "" : String(personalBest.targetValue),
  );
  const [targetDate, setTargetDate] = useState(
    personalBest.targetDate
      ? toDateInputValue(personalBest.targetDate)
      : "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch(`/api/personal-bests/${personalBest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        unit,
        direction,
        notes: notes.trim() ? notes.trim() : null,
        verified,
        targetValue: targetValue.trim() ? Number(targetValue) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
      }),
    });

    setBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string"
          ? data.error
          : "Could not save changes.",
      );
      return;
    }

    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete "${personalBest.name}" and all of its history? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusy(true);
    const res = await fetch(`/api/personal-bests/${personalBest.id}`, {
      method: "DELETE",
    });
    setBusy(false);

    if (!res.ok) {
      setError("Could not delete this record.");
      return;
    }

    router.push("/personal-bests");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Close" : "Edit record"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={remove}
          disabled={busy}
        >
          Delete
        </Button>
      </div>

      {editing && (
        <form onSubmit={save} className="space-y-4 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="editName">Name</Label>
            <Input
              id="editName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editUnit">Unit</Label>
            <Select
              value={unit}
              onValueChange={(next) => setUnit(next as PersonalBestUnitValue)}
            >
              <SelectTrigger id="editUnit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {unitsFor(personalBest.type).map((u) => (
                  <SelectItem key={u} value={u}>
                    {UNIT_LABELS[u]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Changing the unit or scoring recalculates which entry is your best.
            </p>
          </div>

          {personalBest.type === "EXERCISE" ? (
            <div className="space-y-1.5">
              <Label htmlFor="editScoring">Scoring</Label>
              <Select
                value={direction}
                onValueChange={(next) => setDirection(next as Direction)}
              >
                <SelectTrigger id="editScoring">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCORING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {DIRECTION_LABELS[direction]}
              </p>
            </div>
          ) : (
            <p className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
              {DIRECTION_LABELS.LATEST}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="editTarget">Target</Label>
              <Input
                id="editTarget"
                type="number"
                step="any"
                placeholder="none"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editTargetDate">Target date</Label>
              <Input
                id="editTargetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="editNotes">Notes</Label>
            <Textarea
              id="editNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="editVerified">Verified</Label>
            <Switch
              id="editVerified"
              checked={verified}
              onCheckedChange={setVerified}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </form>
      )}

      {error && !editing && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
