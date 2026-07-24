"use client";

import { useState } from "react";
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

type Reward = {
  type: string;
  completionValue: number;
  failurePenalty: number;
};

type Props = {
  onCreated: () => void;
  onCancel: () => void;
};

type FieldErrors = {
  title?: string;
  targetText?: string;
  rewards?: string;
};

function validate(title: string, targetText: string, rewards: Reward[]): FieldErrors {
  const errors: FieldErrors = {};

  if (!title.trim()) {
    errors.title = "Quest title is required";
  } else if (title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters";
  }

  if (!targetText.trim()) {
    errors.targetText = "Target is required";
  } else if (targetText.trim().length < 5) {
    errors.targetText = "Target must be at least 5 characters";
  }

  if (rewards.length === 0) {
    errors.rewards = "At least one stat reward is required";
  }

  return errors;
}

export function CreateQuestForm({ onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetText, setTargetText] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([
    { type: "STR", completionValue: 2, failurePenalty: 1 },
  ]);
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

  function handleBlur(field: keyof FieldErrors) {
    markTouched(field);
    const newErrors = validate(title, targetText, rewards);
    if (newErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: newErrors[field] }));
    } else {
      clearFieldError(field);
    }
  }

  function addReward() {
    if (rewards.length >= 3) return;
    setRewards((prev) => [
      ...prev,
      { type: "END", completionValue: 2, failurePenalty: 1 },
    ]);
    clearFieldError("rewards");
  }

  function removeReward(index: number) {
    setRewards((prev) => prev.filter((_, i) => i !== index));
    // Validate rewards count after removal
    const remaining = rewards.length - 1;
    if (remaining === 0) {
      setFieldErrors((prev) => ({ ...prev, rewards: "At least one stat reward is required" }));
      markTouched("rewards");
    }
  }

  function updateReward(
    index: number,
    field: keyof Reward,
    value: string | number,
  ) {
    setRewards((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark all fields as touched
    setTouched(new Set(["title", "targetText", "rewards"]));

    // Run full validation
    const newErrors = validate(title, targetText, rewards);
    setFieldErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, targetText, rewards }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const apiError =
        typeof data.error === "string"
          ? data.error
          : data.error?.fieldErrors
            ? Object.values(data.error.fieldErrors).flat().join(", ")
            : null;
      setError(apiError ?? "Failed to create quest. Please check your input.");
      setLoading(false);
      return;
    }

    onCreated();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create Custom Quest</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              placeholder="e.g. Morning Run"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearFieldError("title");
              }}
              onBlur={() => handleBlur("title")}
              className={cn(
                touched.has("title") && fieldErrors.title && "border-destructive focus-visible:ring-destructive/50",
              )}
            />
            {touched.has("title") && fieldErrors.title && (
              <p className="text-xs text-destructive mt-0.5">{fieldErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Input
              placeholder="Why this quest matters"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Target */}
          <div className="space-y-1">
            <Label>Target</Label>
            <Input
              placeholder="e.g. Run 5km without stopping"
              value={targetText}
              onChange={(e) => {
                setTargetText(e.target.value);
                clearFieldError("targetText");
              }}
              onBlur={() => handleBlur("targetText")}
              className={cn(
                touched.has("targetText") && fieldErrors.targetText && "border-destructive focus-visible:ring-destructive/50",
              )}
            />
            {touched.has("targetText") && fieldErrors.targetText && (
              <p className="text-xs text-destructive mt-0.5">{fieldErrors.targetText}</p>
            )}
          </div>

          {/* Rewards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Stat Rewards</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReward}
                disabled={rewards.length >= 3}
              >
                + Add Stat
              </Button>
            </div>

            {touched.has("rewards") && fieldErrors.rewards && (
              <p className="text-xs text-destructive">{fieldErrors.rewards}</p>
            )}

            {rewards.map((reward, index) => (
              <div key={index} className="grid grid-cols-3 gap-2 items-end">
                {/* Stat type */}
                <div className="space-y-1">
                  <Label className="text-xs">Stat</Label>
                  <Select
                    value={reward.type}
                    onValueChange={(val) => updateReward(index, "type", val)}
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

                {/* Completion value */}
                <div className="space-y-1">
                  <Label className="text-xs">Gain (+)</Label>
                  <Select
                    value={String(reward.completionValue)}
                    onValueChange={(val) =>
                      updateReward(index, "completionValue", Number(val))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <SelectItem key={v} value={String(v)}>
                          +{v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Failure penalty */}
                <div className="space-y-1">
                  <Label className="text-xs">Penalty (-)</Label>
                  <div className="flex gap-1">
                    <Select
                      value={String(reward.failurePenalty)}
                      onValueChange={(val) =>
                        updateReward(index, "failurePenalty", Number(val))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 1, 2].map((v) => (
                          <SelectItem key={v} value={String(v)}>
                            -{v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {rewards.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-500 px-2"
                        onClick={() => removeReward(index)}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
              <span className="text-red-500 text-sm mt-0.5">⚠</span>
              <p className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={loading}
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Creating..." : "Create Quest"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
