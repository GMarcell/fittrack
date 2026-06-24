"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Session = { date: Date | string };

function groupByWeek(sessions: Session[]) {
  const weeks: Record<string, number> = {};
  sessions.forEach((s) => {
    const d = new Date(s.date);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const key = start.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
    weeks[key] = (weeks[key] ?? 0) + 1;
  });
  return Object.entries(weeks)
    .slice(-8)
    .map(([week, count]) => ({ week, count }));
}

export function ConsistencyChart({ sessions }: { sessions: Session[] }) {
  const data = groupByWeek(sessions);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Training Consistency</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-6">
            No sessions yet — start logging to see your consistency.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <XAxis dataKey="week" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#171717" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
