"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { daysUntil } from "@/lib/utils";

type Goal = {
  id: string;
  name: string;
  priority: string;
  targetDate: Date | string | null;
};

export function GoalCountdown({ goals }: { goals: Goal[] }) {
  const withDates = goals.filter((g) => g.targetDate);
  if (withDates.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {withDates.map((g) => {
        const days = daysUntil(g.targetDate!);
        return (
          <Card key={g.id} className="border-neutral-200">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{g.name}</p>
                <p className="text-xs text-neutral-400">
                  {g.priority === "PRIMARY" ? "Primary goal" : "Secondary goal"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{days}</p>
                <Badge variant="outline" className="text-xs">
                  days left
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
