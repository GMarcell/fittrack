"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRESET_METRICS = [
  { value: "Max Push-ups", label: "Max Push-ups" },
  { value: "Max Pull-ups", label: "Max Pull-ups" },
  { value: "40m Sprint", label: "40m Sprint" },
  { value: "5km Run", label: "5km Run" },
  { value: "Max Squats", label: "Max Squats" },
  { value: "Plank Hold", label: "Plank Hold" },
  { value: "Custom", label: "Custom metric..." },
];

const UNIT_OPTIONS = [
  { value: "REPS", label: "Reps" },
  { value: "SECONDS", label: "Seconds" },
  { value: "MINUTES", label: "Minutes" },
  { value: "METERS", label: "Meters" },
  { value: "KM", label: "Kilometers" },
  { value: "KG", label: "Kilograms" },
  { value: "LB", label: "Pounds" },
  { value: "COUNT", label: "Count" },
];

type FieldErrors = {
  metric?: string;
  value?: string;
  unit?: string;
};

function validate(
  metric: string,
  customMetric: string,
  value: string,
  unit: string,
): FieldErrors {
  const errors: FieldErrors = {};

  const resolvedMetric = metric === "Custom" ? customMetric : metric;

  if (!metric) {
    errors.metric = "Select a benchmark metric";
  } else if (metric === "Custom" && !customMetric.trim()) {
    errors.metric = "Enter a custom metric name";
  }

  if (!value.trim()) {
    errors.value = "Value is required";
  } else {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      errors.value = "Value must be a number";
    } else if (num < 0) {
      errors.value = "Value cannot be negative";
    } else if (num > 99999) {
      errors.value = "Value seems too high";
    } else if (resolvedMetric === "40m Sprint" && num > 20) {
      errors.value = "Sprint time seems too high (expected seconds)";
    } else if (resolvedMetric === "5km Run" && num > 120) {
      errors.value = "5km time seems too high (expected minutes)";
    } else if (resolvedMetric === "Max Push-ups" && num > 500) {
      errors.value = "Push-up count seems too high";
    }
  }

  if (!unit) {
    errors.unit = "Select a unit";
  }

  return errors;
}

function getSuggestedUnit(metric: string): string {
  switch (metric) {
    case "Max Push-ups":
    case "Max Pull-ups":
    case "Max Squats":
      return "REPS";
    case "40m Sprint":
    case "Plank Hold":
      return "SECONDS";
    case "5km Run":
      return "MINUTES";
    default:
      return "";
  }
}

type Props = {
  onDone?: () => void;
};

export function LogBenchmarkForm({ onDone }: Props) {
  const router = useRouter();
  const [metric, setMetric] = useState("");
  const [customMetric, setCustomMetric] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  function markTouched(field: string) {
    setTouched((prev) => new Set(prev).add(field));
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleMetricChange(value: string) {
    setMetric(value);
    clearFieldError("metric");
    clearFieldError("value");
    if (value !== "Custom") {
      const suggested = getSuggestedUnit(value);
      if (suggested) setUnit(suggested);
    }
  }

  function handleBlur(field: keyof FieldErrors) {
    markTouched(field);
    const newErrors = validate(metric, customMetric, value, unit);
    if (newErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: newErrors[field] }));
    } else {
      clearFieldError(field);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched(new Set(["metric", "value", "unit"]));

    const newErrors = validate(metric, customMetric, value, unit);
    setFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const resolvedMetric = metric === "Custom" ? customMetric.trim() : metric;
    const resolvedUnit = unit;

    setLoading(true);
    setError("");

    const res = await fetch("/api/benchmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric: resolvedMetric,
        value: Number(value),
        unit: resolvedUnit,
        date: date || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const apiError =
        typeof data.error === "string"
          ? data.error
          : data.error?.fieldErrors
            ? Object.values(data.error.fieldErrors).flat().join(", ")
            : null;
      setError(apiError ?? "Failed to log benchmark. Please try again.");
      setLoading(false);
      return;
    }

    router.refresh();
    onDone?.();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Log Benchmark</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Metric */}
          <div className="space-y-1">
            <Label>Benchmark</Label>
            <Select value={metric} onValueChange={handleMetricChange}>
              <SelectTrigger
                className={cn(
                  touched.has("metric") && fieldErrors.metric && "border-destructive focus-visible:ring-destructive/50",
                )}
              >
                <SelectValue placeholder="Select a benchmark" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_METRICS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {touched.has("metric") && fieldErrors.metric && (
              <p className="text-xs text-destructive mt-0.5">{fieldErrors.metric}</p>
            )}
          </div>

          {/* Custom metric name (shown when Custom is selected) */}
          {metric === "Custom" && (
            <div className="space-y-1">
              <Label>Custom Metric Name</Label>
              <Input
                placeholder="e.g. Vertical Jump"
                value={customMetric}
                onChange={(e) => {
                  setCustomMetric(e.target.value);
                  clearFieldError("metric");
                }}
                onBlur={() => handleBlur("metric")}
                className={cn(
                  touched.has("metric") && fieldErrors.metric && "border-destructive focus-visible:ring-destructive/50",
                )}
              />
            </div>
          )}

          {/* Value + Unit side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Value</Label>
              <Input
                type="number"
                step="any"
                placeholder="0"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  clearFieldError("value");
                }}
                onBlur={() => handleBlur("value")}
                className={cn(
                  touched.has("value") && fieldErrors.value && "border-destructive focus-visible:ring-destructive/50",
                )}
              />
              {touched.has("value") && fieldErrors.value && (
                <p className="text-xs text-destructive mt-0.5">{fieldErrors.value}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={(val) => { setUnit(val); clearFieldError("unit"); }}>
                <SelectTrigger
                  className={cn(
                    touched.has("unit") && fieldErrors.unit && "border-destructive focus-visible:ring-destructive/50",
                  )}
                >
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {touched.has("unit") && fieldErrors.unit && (
                <p className="text-xs text-destructive mt-0.5">{fieldErrors.unit}</p>
              )}
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label>Date (optional)</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
              <span className="text-red-500 text-sm mt-0.5">⚠</span>
              <p className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging..." : "Log Benchmark"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
