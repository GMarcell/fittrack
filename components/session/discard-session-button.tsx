"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DiscardSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function discard() {
    if (!window.confirm("Discard this unfinished session and its logged sets?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not discard that session");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not discard that session");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={discard}
        disabled={busy}
        className="text-xs text-muted-foreground underline transition-colors hover:text-destructive disabled:opacity-50"
      >
        {busy ? "Discarding…" : "Discard"}
      </button>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </span>
  );
}
