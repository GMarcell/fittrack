"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogBenchmarkForm } from "@/components/benchmarks/log-benchmark-form";
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

  const [showForm, setShowForm] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Benchmark Progress</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? "Cancel" : "+ Log Benchmark"}
            </Button>
            {metrics.length > 0 && (
              <Select
                value={selected}
                onValueChange={setSelected}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metrics.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      {showForm && (
        <CardContent className="pb-0">
          <LogBenchmarkForm
            onDone={() => {
              setShowForm(false);
            }}
          />
        </CardContent>
      )}
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm text-muted-foreground">
              No benchmark data yet.{" "}
              <span className="block mt-1">Log your first benchmark to start tracking progress.</span>
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={filtered}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--foreground)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--foreground)" }}
                activeDot={{ r: 6, fill: "var(--foreground)" }}
                name="Your score"
              />
              {relevantStandards.map((s) => (
                <ReferenceLine
                  key={s.level}
                  y={s.value}
                  stroke={LEVEL_COLORS[s.level] ?? "#e5e7eb"}
                  strokeDasharray="4 4"
                  label={{
                    value: s.level,
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
