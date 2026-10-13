"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatValue, type PersonalBestUnitValue } from "@/lib/personal-best";

export type AttemptRow = {
  id: string;
  value: number;
  date: string | Date;
  notes: string | null;
  isBest: boolean;
  reps?: number | null;
  estimatedOneRep?: number | null;
};

export function AttemptHistory({
  attempts,
  unit,
}: {
  attempts: AttemptRow[];
  unit: PersonalBestUnitValue;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function remove(id: string) {
    setPendingId(id);
    await fetch(`/api/attempts/${id}`, { method: "DELETE" });
    setPendingId(null);
    router.refresh();
  }

  if (attempts.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No entries logged yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {attempts.map((attempt) => (
        <li
          key={attempt.id}
          className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium tabular-nums">
                {formatValue(attempt.value, unit)}
                {attempt.reps ? ` × ${attempt.reps}` : ""}
              </span>
              {attempt.isBest && <Badge variant="secondary">Current best</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(attempt.date)}
              {attempt.estimatedOneRep != null
                ? ` · est. 1RM ${formatValue(attempt.estimatedOneRep, unit)}`
                : ""}
              {attempt.notes ? ` · ${attempt.notes}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground hover:text-destructive"
            disabled={pendingId === attempt.id}
            onClick={() => remove(attempt.id)}
            aria-label={`Delete entry from ${formatDate(attempt.date)}`}
          >
            Delete
          </Button>
        </li>
      ))}
    </ul>
  );
}
