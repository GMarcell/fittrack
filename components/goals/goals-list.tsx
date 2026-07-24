"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { daysUntil } from "@/lib/utils";

type Goal = {
  id: string;
  name: string;
  priority: string;
  status: string;
  targetDate: Date | null;
  archivedAt: Date | null;
  notes: string | null;
};

export function GoalsList({
  activeGoals,
  archivedGoals,
}: {
  activeGoals: Goal[];
  archivedGoals: Goal[];
}) {
  const router = useRouter();
  const [archiving, setArchiving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  async function handleArchive(id: string) {
    setArchiving(id);
    setError(null);
    const res = await fetch(`/api/goals/${id}/archive`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to archive goal" }));
      setError(typeof data.error === "string" ? data.error : "Failed to archive goal");
      setArchiving(null);
      return;
    }
    setArchiving(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    setError(null);
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Failed to delete goal" }));
      setError(typeof data.error === "string" ? data.error : "Failed to delete goal");
      setDeleting(null);
      return;
    }
    setDeleting(null);
    router.refresh();
  }

  function GoalCard({
    goal,
    archived = false,
  }: {
    goal: Goal;
    archived?: boolean;
  }) {
    const days = goal.targetDate ? daysUntil(goal.targetDate) : null;

    return (
      <Card className={archived ? "opacity-60" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{goal.name}</CardTitle>
              {goal.notes && (
                <p className="text-xs text-muted-foreground mt-0.5">{goal.notes}</p>
              )}
            </div>
            <Badge
              variant={goal.priority === "PRIMARY" ? "default" : "secondary"}
            >
              {goal.priority}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {days !== null && !archived && (
              <Badge variant="outline">
                {days > 0 ? `${days} days left` : `${Math.abs(days)} days ago`}
              </Badge>
            )}
            {archived && goal.archivedAt && (
              <Badge variant="outline">
                Archived{" "}
                {new Date(goal.archivedAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Badge>
            )}
          </div>

          {!archived && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={archiving === goal.id || deleting === goal.id}
                onClick={() => handleArchive(goal.id)}
              >
                {archiving === goal.id ? "Archiving..." : "Archive"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive/80"
                disabled={archiving === goal.id || deleting === goal.id}
                onClick={() => handleDelete(goal.id)}
              >
                {deleting === goal.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
          <span className="text-red-500 text-sm mt-0.5">⚠</span>
          <p className="text-xs text-red-600 dark:text-red-400 flex-1">{error}</p>
          <button
            className="text-red-400 hover:text-red-600 text-sm leading-none"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}
      {/* Active goals */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Active ({activeGoals.length})
        </h2>
        {activeGoals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No active goals yet.
            </CardContent>
          </Card>
        ) : (
          activeGoals.map((g) => <GoalCard key={g.id} goal={g} />)
        )}
      </div>

      {/* Archived goals */}
      {archivedGoals.length > 0 && (
        <div className="space-y-3">
          <button
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? "▾" : "▸"} Archived ({archivedGoals.length})
          </button>
          {showArchived &&
            archivedGoals.map((g) => <GoalCard key={g.id} goal={g} archived />)}
        </div>
      )}
    </div>
  );
}
