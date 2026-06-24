"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Reward = {
  id: string;
  type: string;
  completionValue: number;
  failurePenalty: number;
};

type Quest = {
  id: string;
  title: string;
  description: string | null;
  targetText: string;
  status: "OFFERED" | "PENDING" | "COMPLETED" | "FAILED";
  rewards: Reward[];
};

const STATUS_COLORS: Record<Quest["status"], string> = {
  OFFERED: "bg-neutral-100 text-neutral-600",
  PENDING: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<Quest["status"], string> = {
  OFFERED: "Available",
  PENDING: "In Progress",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function DailyQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchQuests() {
    const res = await fetch("/api/quests/today");
    const data = await res.json();
    setQuests(data);
    setLoading(false);
  }

  async function regenerate() {
    setRegenerating(true);
    const res = await fetch("/api/quests/generate", { method: "POST" });
    const data = await res.json();
    setQuests(data);
    setRegenerating(false);
  }

  async function accept(questId: string) {
    setActionLoading(questId);
    const res = await fetch(`/api/quests/${questId}/accept`, {
      method: "POST",
    });
    const updated = await res.json();
    setQuests((prev) => prev.map((q) => (q.id === questId ? updated : q)));
    setActionLoading(null);
  }

  async function complete(questId: string) {
    setActionLoading(questId);
    const res = await fetch(`/api/quests/${questId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const updated = await res.json();
    setQuests((prev) => prev.map((q) => (q.id === questId ? updated : q)));
    setActionLoading(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/quests/today");
      const data = await res.json();
      if (!cancelled) {
        setQuests(data);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasPending = quests.some(
    (q) => q.status === "PENDING" || q.status === "COMPLETED",
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Today&apos;s Quests</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={regenerate}
            disabled={regenerating || hasPending}
          >
            {regenerating ? "Generating..." : "⟳ Refresh"}
          </Button>
        </div>
        {!hasPending && quests.some((q) => q.status === "OFFERED") && (
          <p className="text-xs text-yellow-600 mt-1">
            ⚠ Accept at least 1 quest to keep your streak
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-neutral-400 text-center py-4">
            The System is preparing your quests...
          </p>
        ) : (
          quests.map((quest) => (
            <div key={quest.id} className="border rounded-lg p-4 space-y-2">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{quest.title}</p>
                  {quest.description && (
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {quest.description}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[quest.status]}`}
                >
                  {STATUS_LABELS[quest.status]}
                </span>
              </div>

              {/* Target */}
              <p className="text-xs text-neutral-600 bg-neutral-50 px-3 py-2 rounded">
                🎯 {quest.targetText}
              </p>

              {/* Rewards */}
              <div className="flex gap-2 flex-wrap">
                {quest.rewards.map((r) => (
                  <div key={r.id} className="flex gap-1">
                    <Badge variant="secondary" className="text-xs">
                      +{r.completionValue} {r.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-red-500">
                      -{r.failurePenalty} if failed
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {quest.status === "OFFERED" && (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={actionLoading === quest.id}
                    onClick={() => accept(quest.id)}
                  >
                    {actionLoading === quest.id ? "..." : "Accept Quest"}
                  </Button>
                )}
                {quest.status === "PENDING" && (
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={actionLoading === quest.id}
                    onClick={() => complete(quest.id)}
                  >
                    {actionLoading === quest.id ? "..." : "✓ Mark Complete"}
                  </Button>
                )}
                {quest.status === "COMPLETED" && (
                  <p className="text-xs text-green-600 font-medium">
                    ✓ Quest completed — stats updated
                  </p>
                )}
                {quest.status === "FAILED" && (
                  <p className="text-xs text-red-500 font-medium">
                    ✗ Quest failed — stat penalty applied
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
