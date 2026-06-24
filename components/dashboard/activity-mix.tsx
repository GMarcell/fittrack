"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Session = { activityType: { name: string } };

export function ActivityMix({ sessions }: { sessions: Session[] }) {
  const counts: Record<string, number> = {};
  sessions.forEach((s) => {
    const name = s.activityType.name;
    counts[name] = (counts[name] ?? 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = sessions.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity Mix</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-6">
            No data yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sorted.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-32 text-sm text-neutral-600">{name}</div>
                <div className="flex-1 bg-neutral-100 rounded-full h-2">
                  <div
                    className="bg-neutral-900 h-2 rounded-full"
                    style={{ width: `${(count / total) * 100}%` }}
                  />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
