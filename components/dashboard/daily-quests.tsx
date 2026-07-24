"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CreateQuestForm } from "../quests/create-quest-form";

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
  OFFERED: "bg-muted text-muted-foreground",
  PENDING:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  COMPLETED:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<Quest["status"], string> = {
  OFFERED: "Available",
  PENDING: "In Progress",
  COMPLETED: "Completed",
  FAILED: "Failed",
};

export function DailyQuests({ initialQuests = [] }: { initialQuests?: Quest[] }) {
  const router = useRouter();
  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [regenerating, setRegenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(initialQuests.length === 0);
  const [completingQuestId, setCompletingQuestId] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");
  const [completionError, setCompletionError] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function regenerate() {
    setRegenerating(true);
    setActionError(null);
    const res = await fetch("/api/quests/generate", { method: "POST" });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to regenerate quests. Try again." }));
      setActionError(err.error ?? "Failed to regenerate quests. Try again.");
      setRegenerating(false);
      return;
    }

    const data = await res.json();
    setQuests(data);
    setRegenerating(false);
    router.refresh();
  }

  async function accept(questId: string) {
    setActionLoading(questId);
    setActionError(null);
    const res = await fetch(`/api/quests/${questId}/accept`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to accept quest" }));
      setActionError(err.error ?? "Failed to accept quest");
      setActionLoading(null);
      return;
    }

    const updated = await res.json();
    setQuests((prev) => prev.map((q) => (q.id === questId ? updated : q)));
    setActionLoading(null);
    router.refresh();
  }

  async function confirmComplete(questId: string) {
    if (completionNote.trim().length < 5) {
      setCompletionError("Please describe what you did (at least 5 characters)");
      return;
    }

    setActionLoading(questId);
    setCompletionError("");

    const res = await fetch(`/api/quests/${questId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionNote: completionNote.trim() }),
    });

    if (!res.ok) {
      const err = await res.json();
      setCompletionError(err.error ?? "Failed to complete quest");
      setActionLoading(null);
      setActionError(null);
      return;
    }

    const updated = await res.json();
    setQuests((prev) => prev.map((q) => (q.id === questId ? updated : q)));
    setActionLoading(null);
    setCompletingQuestId(null);
    setCompletionNote("");
    // Refresh server components to update radar chart + level
    router.refresh();
  }

  const hasPending = quests.some(
    (q) => q.status === "PENDING" || q.status === "COMPLETED",
  );

  async function fetchQuests() {
    setLoading(true);
    setActionError(null);
    const res = await fetch("/api/quests/today");

    if (!res.ok) {
      setActionError("Failed to load quests.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setQuests(data);
    setLoading(false);
  }

  useEffect(() => {
    // If no initial data from server (e.g. cold navigation or empty), fetch from client
    if (initialQuests.length === 0) {
      let cancelled = false;
      async function load() {
        setLoading(true);
        const res = await fetch("/api/quests/today");
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setQuests(data);
          } else {
            setActionError("Failed to load quests.");
          }
          setLoading(false);
        }
      }
      load();
      return () => {
        cancelled = true;
      };
    }
  }, [initialQuests.length]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Today&apos;s Quests</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={regenerate}
              disabled={regenerating || hasPending}
            >
              {regenerating ? "Generating..." : "⟳ Refresh"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateForm((v) => !v)}
            >
              {showCreateForm ? "Cancel" : "+ Custom"}
            </Button>
          </div>
        </div>
        {!hasPending && quests.some((q) => q.status === "OFFERED") && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            ⚠ Accept at least 1 quest to keep your streak
          </p>
        )}
      </CardHeader>
      {showCreateForm && (
        <div className="px-6 pb-2">
          <CreateQuestForm
            onCreated={() => {
              setShowCreateForm(false);
              fetchQuests();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}
      <CardContent className="space-y-3">
        {/* General action error banner */}
        {actionError && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
            <span className="text-red-500 text-sm mt-0.5">⚠</span>
            <p className="text-xs text-red-600 dark:text-red-400 flex-1">{actionError}</p>
            <button
              className="text-red-400 hover:text-red-600 text-sm leading-none"
              onClick={() => setActionError(null)}
            >
              ✕
            </button>
          </div>
        )}
        {quests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No quests for today yet.
          </p>
        ) : (
          quests.map((quest) => (
            <div key={quest.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{quest.title}</p>
                  {quest.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
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

              <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded">
                🎯 {quest.targetText}
              </p>

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
                {quest.status === "PENDING" && completingQuestId !== quest.id && (
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={actionLoading === quest.id}
                    onClick={() => {
                      setCompletingQuestId(quest.id);
                      setCompletionNote("");
                      setCompletionError("");
                    }}
                  >
                    ✓ Mark Complete
                  </Button>
                )}
                {quest.status === "PENDING" && completingQuestId === quest.id && (
                  <div className="space-y-2 w-full">
                    <Textarea
                      rows={2}
                      placeholder="Describe what you did to complete this quest..."
                      value={completionNote}
                      onChange={(e) => {
                        setCompletionNote(e.target.value);
                        setCompletionError("");
                      }}
                    />
                    {completionError && (
                      <p className="text-xs text-red-500">{completionError}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={actionLoading === quest.id}
                        onClick={() => {
                          setCompletingQuestId(null);
                          setCompletionNote("");
                          setCompletionError("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        disabled={actionLoading === quest.id}
                        onClick={() => confirmComplete(quest.id)}
                      >
                        {actionLoading === quest.id ? "..." : "Confirm"}
                      </Button>
                    </div>
                  </div>
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
