"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  UNIT_LABELS,
  formatValue,
  type Direction,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";

export type ProgressPoint = {
  value: number;
  date: string | Date;
  isBest?: boolean;
  estimatedOneRep?: number | null;
};

function formatTick(date: Date | string) {
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function ProgressChart({
  points,
  unit,
  direction,
  bestValue,
  target,
  height = 240,
}: {
  points: ProgressPoint[];
  unit: PersonalBestUnitValue;
  direction: Direction;
  bestValue?: number;
  target?: number | null;
  height?: number;
}) {
  const hasEstimates = points.some((p) => p.estimatedOneRep != null);
  const [mode, setMode] = useState<"value" | "oneRep">("value");

  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const usingEstimates = mode === "oneRep" && hasEstimates;

  const data = sorted
    .filter((p) => !usingEstimates || p.estimatedOneRep != null)
    .map((p) => ({
      label: formatTick(p.date),
      fullDate: new Date(p.date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      value: usingEstimates ? (p.estimatedOneRep as number) : p.value,
      isBest: p.isBest ?? false,
    }));

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No entries yet — log one to start the chart.
      </p>
    );
  }

  const best = usingEstimates
    ? Math.max(...data.map((d) => d.value))
    : (bestValue ??
      (direction === "LOWER"
        ? Math.min(...data.map((d) => d.value))
        : Math.max(...data.map((d) => d.value))));

  const bestLabel = usingEstimates
    ? "Est. 1RM"
    : direction === "LATEST"
      ? "Current"
      : "Best";

  return (
    <div className="space-y-3">
      {hasEstimates && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            size="xs"
            variant={mode === "value" ? "secondary" : "ghost"}
            onClick={() => setMode("value")}
          >
            Logged value
          </Button>
          <Button
            type="button"
            size="xs"
            variant={mode === "oneRep" ? "secondary" : "ghost"}
            onClick={() => setMode("oneRep")}
          >
            Est. 1RM
          </Button>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [formatValue(value, unit), "Value"]}
            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullDate ?? ""}
          />

          {!usingEstimates && target != null && (
            <ReferenceLine
              y={target}
              stroke="var(--chart-2, var(--primary))"
              strokeDasharray="2 3"
              label={{
                value: `Target ${target} ${UNIT_LABELS[unit]}`,
                position: "insideBottomRight",
                fontSize: 10,
                fill: "var(--muted-foreground)",
              }}
            />
          )}

          <ReferenceLine
            y={best}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: `${bestLabel} ${best} ${UNIT_LABELS[unit]}`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "var(--muted-foreground)",
            }}
          />

          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2}
            dot={(props: {
              cx?: number;
              cy?: number;
              payload?: { isBest?: boolean };
              index?: number;
            }) => {
              const { cx, cy, payload, index } = props;
              if (cx === undefined || cy === undefined) {
                return <g key={`dot-${index}`} />;
              }
              return (
                <circle
                  key={`dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={payload?.isBest && !usingEstimates ? 5 : 3.5}
                  fill={
                    payload?.isBest && !usingEstimates
                      ? "var(--primary)"
                      : "var(--card)"
                  }
                  stroke="var(--primary)"
                  strokeWidth={2}
                />
              );
            }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
