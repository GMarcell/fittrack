"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
              tick={{ fontSize: 12, fill: "#6b7280" }}
            />
            <Radar
              name="Stats"
              dataKey="value"
              stroke="#171717"
              fill="#171717"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Tooltip formatter={(value) => [`${value}/100`, "Value"]} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
