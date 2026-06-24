"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Benchmark = {
  metric: string;
  value: number;
  date: Date | string;
  unit: string;
};
type Standard = { metric: string; level: string; value: number };

export function BenchmarkChart({
  benchmarks,
  standards,
}: {
  benchmarks: Benchmark[];
  standards: Standard[];
}) {
  const metrics = [...new Set(benchmarks.map((b) => b.metric))];
  const [selected, setSelected] = useState(metrics[0] ?? "");

  const filtered = benchmarks
    .filter((b) => b.metric === selected)
    .map((b) => ({
      date: new Date(b.date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
      value: b.value,
    }));

  const relevantStandards = standards.filter((s) => s.metric === selected);

  const LEVEL_COLORS: Record<string, string> = {
    Beginner: "#d1d5db",
    Average: "#93c5fd",
    Good: "#4ade80",
    Excellent: "#facc15",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Benchmark Progress</CardTitle>
          <select
            className="text-sm border rounded px-2 py-1"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {metrics.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-6">
            No benchmark data yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={filtered}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#171717"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Your score"
              />
              {relevantStandards.map((s) => (
                <ReferenceLine
                  key={s.level}
                  y={s.value}
                  stroke={LEVEL_COLORS[s.level] ?? "#e5e7eb"}
                  strokeDasharray="4 4"
                  label={{ value: s.level, fontSize: 11, fill: "#6b7280" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
