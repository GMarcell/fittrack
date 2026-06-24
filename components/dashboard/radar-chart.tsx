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

type Session = {
  sessionExercises: {
    exercise: { category: string };
  }[];
};

const ATTRIBUTES = [
  "STRENGTH",
  "CONDITIONING",
  "SKILL",
  "FLEXIBILITY",
  "OTHER",
];

const LABEL_MAP: Record<string, string> = {
  STRENGTH: "Strength",
  CONDITIONING: "Cardio",
  SKILL: "Skill",
  FLEXIBILITY: "Flexibility",
  OTHER: "Other",
};

function computeScores(sessions: Session[]) {
  const counts: Record<string, number> = {};
  ATTRIBUTES.forEach((a) => (counts[a] = 0));

  sessions.forEach((s) => {
    s.sessionExercises.forEach((se) => {
      const cat = se.exercise.category;
      if (cat in counts) counts[cat]++;
    });
  });

  const max = Math.max(...Object.values(counts), 1);
  return ATTRIBUTES.map((attr) => ({
    attribute: LABEL_MAP[attr],
    score: Math.round((counts[attr] / max) * 100),
  }));
}

export function FitnessRadarChart({ sessions }: { sessions: Session[] }) {
  const data = computeScores(sessions);
  const hasData = data.some((d) => d.score > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fitness Attributes</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-sm text-neutral-400 text-center py-6">
            Log sessions with exercises to see your attributes.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis
                dataKey="attribute"
                tick={{ fontSize: 12, fill: "#6b7280" }}
              />
              <Radar
                name="Score"
                dataKey="score"
                stroke="#171717"
                fill="#171717"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip formatter={(value) => [`${value}/100`, "Score"]} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
