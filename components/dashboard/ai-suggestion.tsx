"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AiSuggestion() {
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchSuggestion() {
    setLoading(true);
    setError("");
    setSuggestion("");

    const res = await fetch("/api/ai/suggest", { method: "POST" });
    if (!res.ok) {
      setError("Failed to get suggestion. Try again.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setSuggestion(data.suggestion);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">AI Training Suggestion</CardTitle>
          <Button size="sm" onClick={fetchSuggestion} disabled={loading}>
            {loading ? "Thinking..." : "Get Next Week's Plan"}
          </Button>
        </div>
      </CardHeader>
      {(suggestion || error) && (
        <CardContent>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {suggestion && (
            <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
              {suggestion}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
