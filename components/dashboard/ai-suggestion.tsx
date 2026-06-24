"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  targetText: string;
  rewards: Reward[];
};

export function AiSuggestion() {
  const router = useRouter();
  const [suggestion, setSuggestion] = useState("");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchSuggestion() {
    setLoading(true);
    setError("");
    setSuggestion("");
    setQuests([]);

    const res = await fetch("/api/ai/suggest", { method: "POST" });
    if (!res.ok) {
      setError("Failed to get suggestion. Try again.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setSuggestion(data.suggestion);
    setQuests(data.quests ?? []);
    setLoading(false);

    // Refresh dashboard so DailyQuests component picks up new quests
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">AI Weekly Plan</CardTitle>
          <Button size="sm" onClick={fetchSuggestion} disabled={loading}>
            {loading ? "Generating..." : "Generate Weekly Plan"}
          </Button>
        </div>
      </CardHeader>

      {(suggestion || error || quests.length > 0) && (
        <CardContent className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {suggestion && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {suggestion}
            </p>
          )}

          {quests.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Today&apos;s quests from this plan
              </p>
              {quests.map((q) => (
                <div key={q.id} className="border rounded-lg p-3 space-y-1">
                  <p className="text-sm font-medium">{q.title}</p>
                  <p className="text-xs text-muted-foreground">🎯 {q.targetText}</p>
                  <div className="flex gap-1 flex-wrap">
                    {q.rewards.map((r) => (
                      <Badge key={r.id} variant="secondary" className="text-xs">
                        +{r.completionValue} {r.type}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground/70">
                ↑ These quests are now live in Today&apos;s Quests above —
                accept them to start earning stats.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
