"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type Stat = { type: string; value: number };
type HistoryEntry = {
  id: string;
  type: string;
  delta: number;
  reason: string;
  createdAt: Date | string;
};

const STAT_LABELS: Record<string, string> = {
  STR: "Strength",
  END: "Endurance",
  AGI: "Agility",
  SPD: "Speed",
  PWR: "Power",
  FLX: "Flexibility",
  VIT: "Vitality",
  DSC: "Discipline",
};

const STAT_COLORS: Record<string, string> = {
  STR: "#ef4444",
  END: "#3b82f6",
  AGI: "#10b981",
  SPD: "#f59e0b",
  PWR: "#8b5cf6",
  FLX: "#ec4899",
  VIT: "#14b8a6",
  DSC: "#f97316",
};

export function StatHistoryChart({
  stats,
  history,
}: {
  stats: Stat[];
  history: HistoryEntry[];
}) {
  const [selected, setSelected] = useState(stats[0]?.type ?? "STR");

  // Build cumulative value over time for the selected stat
  const chartData = useMemo(() => {
    const filtered = history.filter((h) => h.type === selected);
    if (filtered.length === 0) return [];

    // Find the starting value by working backwards from current
    const currentStat = stats.find((s) => s.type === selected);
    const currentValue = currentStat?.value ?? 0;
    const totalDelta = filtered.reduce((sum, h) => sum + h.delta, 0);
    let runningValue = currentValue - totalDelta;

    return filtered.map((entry) => {
      runningValue += entry.delta;
      return {
        date: new Date(entry.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        }),
        value: Math.round(runningValue * 10) / 10,
        delta: entry.delta,
        reason: entry.reason,
      };
    });
  }, [selected, history, stats]);

  const currentValue = stats.find((s) => s.type === selected)?.value ?? 0;

  return (
    <div className="space-y-4">
      {/* Stat selector */}
      <div className="flex gap-2 flex-wrap">
        {stats.map((s) => (
          <button
            key={s.type}
            onClick={() => setSelected(s.type)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selected === s.type
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {STAT_LABELS[s.type]} ({Math.round(s.value)})
          </button>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {STAT_LABELS[selected]} over time
            </CardTitle>
            <span
              className="text-2xl font-bold"
              style={{ color: STAT_COLORS[selected] }}
            >
              {Math.round(currentValue)}
              <span className="text-sm font-normal text-muted-foreground/60">/100</span>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (              <p className="text-sm text-muted-foreground text-center py-8">
                No history yet for {STAT_LABELS[selected]} — complete quests or
                log sessions to see progress.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-md text-xs space-y-1">
                        <p className="font-medium">{d.date}</p>
                        <p>
                          Value: <span className="font-bold">{d.value}</span>
                        </p>
                        <p
                          className={
                            d.delta > 0            ? "text-green-500" : "text-red-500"
                          }
                        >
                          {d.delta > 0 ? `+${d.delta}` : d.delta}
                        </p>
                        <p className="text-muted-foreground max-w-48 truncate">
                          {d.reason}
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={50} stroke="#ffffff1a" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={STAT_COLORS[selected]}
                  strokeWidth={2}
                  dot={{ r: 4, fill: STAT_COLORS[selected] }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (              <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <div className="space-y-2">
              {[...chartData]
                .reverse()
                .slice(0, 8)
                .map((entry, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs font-bold shrink-0 ${
                          entry.delta > 0            ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {entry.reason}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground/70 shrink-0 ml-2">
                      {entry.date}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
