"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CoachCheckinButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function checkIn() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/coach/checkin", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Check-in failed");
      setResult(body?.plan?.summary ?? "Plan updated.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={checkIn} disabled={busy} variant="default">
        {busy ? "Coach is reviewing your last 2 weeks…" : "Weekly coach check-in"}
      </Button>
      {result && !busy && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
          <span className="font-medium">Coach: </span>
          {result}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
