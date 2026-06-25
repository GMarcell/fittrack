"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Session = { date: Date | string };

function getThisWeekCount(sessions: Session[]) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  return sessions.filter((s) => new Date(s.date) >= startOfWeek).length;
}

export function WeeklyProgress({
  sessions,
  target = 5,
}: {
  sessions: Session[];
  target?: number;
}) {
  const count = getThisWeekCount(sessions);
  const percentage = Math.min(Math.round((count / target) * 100), 100);
  const remaining = Math.max(target - count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">This Week</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-4xl font-bold">{count}</span>
            <span className="text-neutral-400 text-sm ml-1">
              / {target} sessions
            </span>
          </div>
          <span className="text-sm text-neutral-500 mb-1">{percentage}%</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-neutral-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              percentage >= 100
                ? "bg-green-500"
                : percentage >= 60
                  ? "bg-yellow-400"
                  : "bg-neutral-900"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-xs text-neutral-500">
          {percentage >= 100
            ? "🎉 Weekly target hit — great work!"
            : remaining === 1
              ? "1 session left to hit your target"
              : `${remaining} sessions left to hit your target`}
        </p>
      </CardContent>
    </Card>
  );
}
