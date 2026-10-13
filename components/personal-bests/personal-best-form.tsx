"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CUSTOM_PRESET_NAME,
  DIRECTION_LABELS,
  SCORING_OPTIONS,
  TYPE_LABELS,
  UNIT_LABELS,
  defaultDirection,
  estimateOneRepMax,
  formatValue,
  presetsFor,
  supportsReps,
  toDateInputValue,
  unitsFor,
  type Direction,
  type PersonalBestTypeValue,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";

type FieldErrors = Partial<
  Record<"name" | "value" | "unit" | "date" | "target" | "reps", string>
>;

type Props = {
  /** Pre-selects a category when logging from the body metrics page. */
  defaultType?: PersonalBestTypeValue;
  /** Called after a successful save instead of navigating away. */
  onSaved?: (result: { isPersonalBest: boolean }) => void;
};

export function PersonalBestForm({ defaultType = "EXERCISE", onSaved }: Props) {
  const router = useRouter();

  const [type, setType] = useState<PersonalBestTypeValue>(defaultType);
  const [preset, setPreset] = useState("");
  const [customName, setCustomName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<PersonalBestUnitValue>(
    unitsFor(defaultType)[0],
  );
  const [direction, setDirection] = useState<Direction>(
    defaultDirection(defaultType, unitsFor(defaultType)[0]),
  );
  const [reps, setReps] = useState("");
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [verified, setVerified] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const presets = useMemo(() => presetsFor(type), [type]);
  const units = useMemo(() => unitsFor(type), [type]);

  const isCustom = preset === CUSTOM_PRESET_NAME;
  const resolvedName = isCustom ? customName.trim() : preset;
  const wantReps = type === "EXERCISE" && supportsReps(unit);
  const oneRepPreview =
    wantReps && value && reps
      ? estimateOneRepMax(Number(value), Number(reps))
      : null;

  function switchType(next: PersonalBestTypeValue) {
    if (next === type) return;
    setType(next);
    setPreset("");
    setCustomName("");
    setValue("");
    setUnit(unitsFor(next)[0]);
    setDirection(defaultDirection(next, unitsFor(next)[0]));
    setErrors({});
  }

  function choosePreset(name: string) {
    setPreset(name);
    setErrors((prev) => ({ ...prev, name: undefined, value: undefined }));

    if (name === CUSTOM_PRESET_NAME) {
      setUnit(units[0]);
      setDirection(defaultDirection(type, units[0]));
      return;
    }

    const match = presets.find((p) => p.name === name);
    if (match) {
      setUnit(match.unit);
      setDirection(match.direction);
    }
  }

  function chooseUnit(next: PersonalBestUnitValue) {
    setUnit(next);
    setDirection(defaultDirection(type, next));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};

    if (!resolvedName) next.name = "Pick a preset or name your own.";
    if (!value.trim()) next.value = "Value is required.";
    else if (!Number.isFinite(Number(value)))
      next.value = "Value must be a number.";
    if (!unit) next.unit = "Unit is required.";
    if (!date) next.date = "Date is required.";
    if (targetValue.trim() && !Number.isFinite(Number(targetValue)))
      next.target = "Target must be a number.";

    return next;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    setFormError("");

    try {
      const res = await fetch("/api/personal-bests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name: resolvedName,
          value: Number(value),
          unit,
          direction,
          reps: reps ? Number(reps) : undefined,
          targetValue: targetValue.trim() ? Number(targetValue) : undefined,
          targetDate: targetDate ? new Date(targetDate) : undefined,
          date: new Date(date),
          notes: notes.trim() || undefined,
          verified,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(
          typeof data.error === "string"
            ? data.error
            : "Could not save this entry. Please check the form and try again.",
        );
        setSaving(false);
        return;
      }

      const data = (await res.json()) as { isPersonalBest?: boolean };
      const isPersonalBest = data.isPersonalBest ?? false;

      router.refresh();

      if (onSaved) {
        onSaved({ isPersonalBest });
        setValue("");
        setReps("");
        setNotes("");
        setVerified(false);
        setSaving(false);
        return;
      }

      router.push(
        isPersonalBest
          ? "/personal-bests?new=1"
          : "/personal-bests?logged=1",
      );
    } catch {
      setFormError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log an entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="grid grid-cols-2 gap-2">
              {([...["EXERCISE", "BODY_METRIC"]] as PersonalBestTypeValue[]).map(
                (option) => (
                  <Button
                    key={option}
                    type="button"
                    variant={type === option ? "default" : "outline"}
                    onClick={() => switchType(option)}
                  >
                    {TYPE_LABELS[option]}
                  </Button>
                ),
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="preset">Record</Label>
            <Select value={preset} onValueChange={choosePreset}>
              <SelectTrigger
                id="preset"
                aria-invalid={Boolean(errors.name && !isCustom)}
                className={cn(
                  errors.name && !isCustom && "border-destructive",
                )}
              >
                <SelectValue placeholder="Select a record" />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                    {p.name === CUSTOM_PRESET_NAME ? "" : ` · ${UNIT_LABELS[p.unit]}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.name && !isCustom && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>

          {isCustom && (
            <div className="space-y-1.5">
              <Label htmlFor="customName">Record name</Label>
              <Input
                id="customName"
                placeholder="e.g. Box Jump"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                aria-invalid={Boolean(errors.name)}
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                placeholder="0"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setErrors((prev) => ({ ...prev, value: undefined }));
                }}
                aria-invalid={Boolean(errors.value)}
                className={cn(errors.value && "border-destructive")}
              />
              {errors.value && (
                <p className="text-xs text-destructive">{errors.value}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Select
                value={unit}
                onValueChange={(next) =>
                  chooseUnit(next as PersonalBestUnitValue)
                }
              >
                <SelectTrigger
                  id="unit"
                  aria-invalid={Boolean(errors.unit)}
                  className={cn(errors.unit && "border-destructive")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-xs text-destructive">{errors.unit}</p>
              )}
            </div>
          </div>

          {wantReps && (
            <div className="space-y-1.5">
              <Label htmlFor="reps">Reps performed (optional)</Label>
              <Input
                id="reps"
                type="number"
                min="1"
                max="100"
                inputMode="numeric"
                placeholder="e.g. 5"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                aria-invalid={Boolean(errors.reps)}
                className={cn(errors.reps && "border-destructive")}
              />
              {oneRepPreview !== null ? (
                <p className="text-xs text-muted-foreground">
                  Estimated 1RM: {" "}
                  <span className="font-medium text-foreground">
                    {formatValue(oneRepPreview, unit)}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add reps to also track an estimated one-rep max.
                </p>
              )}
            </div>
          )}

          {type === "EXERCISE" && (
            <div className="space-y-1.5">
              <Label htmlFor="scoring">Scoring</Label>
              <Select
                value={direction}
                onValueChange={(next) => setDirection(next as Direction)}
              >
                <SelectTrigger id="scoring">
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
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="date">Date achieved</Label>
            <Input
              id="date"
              type="date"
              value={date}
              max={toDateInputValue(new Date())}
              onChange={(e) => {
                setDate(e.target.value);
                setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              aria-invalid={Boolean(errors.date)}
              className={cn(errors.date && "border-destructive")}
            />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {DIRECTION_LABELS[direction]}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="targetValue">Target (optional)</Label>
              <Input
                id="targetValue"
                type="number"
                step="any"
                placeholder="e.g. 50"
                value={targetValue}
                onChange={(e) => {
                  setTargetValue(e.target.value);
                  setErrors((prev) => ({ ...prev, target: undefined }));
                }}
                aria-invalid={Boolean(errors.target)}
                className={cn(errors.target && "border-destructive")}
              />
              {errors.target && (
                <p className="text-xs text-destructive">{errors.target}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="targetDate">Target date (optional)</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="How did it feel?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="verified">Verified</Label>
              <p className="text-xs text-muted-foreground">
                Judged, filmed or witnessed.
              </p>
            </div>
            <Switch
              id="verified"
              checked={verified}
              onCheckedChange={setVerified}
            />
          </div>

          {formError && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Save entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
