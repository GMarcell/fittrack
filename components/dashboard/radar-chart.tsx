"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type Stat = { type: string; value: number };

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

export function FitnessRadarChart({ stats }: { stats: Stat[] }) {
  const data = stats.map((s) => ({
    attribute: STAT_LABELS[s.type] ?? s.type,
    value: Math.round(s.value),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hunter Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="attribute"
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <Radar
              name="Stats"
              dataKey="value"
              stroke="var(--foreground)"
              fill="var(--foreground)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value: number, name: string) => [value, name]}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                return (
                  <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-xs">
                    <p className="font-semibold text-foreground">
                      {d.payload.attribute}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      <span className="text-foreground font-bold text-sm">
                        {d.value}
                      </span>
                      <span className="text-muted-foreground/60">/100</span>
                    </p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="text-center mt-2">
          <Link
            href="/stats"
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            View stat history →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
