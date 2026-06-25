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

export function CreateQuestForm({ onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetText, setTargetText] = useState("");
  const [rewards, setRewards] = useState<Reward[]>([
    { type: "STR", completionValue: 2, failurePenalty: 1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addReward() {
    if (rewards.length >= 3) return;
    setRewards((prev) => [
      ...prev,
      { type: "END", completionValue: 2, failurePenalty: 1 },
    ]);
  }

  function removeReward(index: number) {
    setRewards((prev) => prev.filter((_, i) => i !== index));
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
    setLoading(true);
    setError("");

    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, targetText, rewards }),
    });

    if (!res.ok) {
      setError("Failed to create quest.");
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
              onChange={(e) => setTitle(e.target.value)}
              required
            />
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
              onChange={(e) => setTargetText(e.target.value)}
              required
            />
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

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
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
