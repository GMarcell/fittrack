"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogBenchmarkForm } from "@/components/benchmarks/log-benchmark-form";

type Benchmark = {
  id: string;
  metric: string;
  value: number;
  unit: string;
  date: Date | string;
};

type Standard = { metric: string; level: string; value: number };

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  Average: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  Good: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  Excellent: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export function BenchmarksPageContent({
  benchmarks,
  standards,
}: {
  benchmarks: Benchmark[];
  standards: Standard[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const metrics = useMemo(
    () => [...new Set(benchmarks.map((b) => b.metric))].sort(),
    [benchmarks],
  );

  const effectiveMetric = selectedMetric ?? metrics[0] ?? null;

  const filteredBenchmarks = effectiveMetric
    ? benchmarks.filter((b) => b.metric === effectiveMetric)
    : [];

  const metricStandards = effectiveMetric
    ? standards.filter((s) => s.metric === effectiveMetric)
    : [];

  // Best value for the selected metric
  const bestValue = filteredBenchmarks.length > 0
    ? Math.max(...filteredBenchmarks.map((b) => b.value))
    : null;

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Log Benchmark"}
        </Button>
      </div>

      {/* Log form */}
      {showForm && (
        <LogBenchmarkForm
          onDone={() => {
            setShowForm(false);
          }}
        />
      )}

      {/* No data state */}
      {benchmarks.length === 0 && !showForm && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-sm text-muted-foreground">
              No benchmarks logged yet.
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Click &quot;+ Log Benchmark&quot; above to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {benchmarks.length > 0 && (
        <>
          {/* Metric selector */}
          <div className="flex gap-2 flex-wrap">
            {metrics.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMetric(m)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  effectiveMetric === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Best value banner */}
          {bestValue !== null && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Best {effectiveMetric}
                  </p>
                  <p className="text-xl font-bold mt-0.5">
                    {bestValue}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      {(benchmarks.find((b) => b.metric === effectiveMetric)?.unit ?? "").toLowerCase()}
                    </span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {metricStandards
                    .filter((s) => bestValue >= s.value)
                    .slice(-1)
                    .map((s) => (
                      <Badge
                        key={s.level}
                        className={LEVEL_COLORS[s.level] ?? ""}
                      >
                        {s.level}
                      </Badge>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Standards reference */}
          {metricStandards.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {metricStandards.map((s) => (
                <Badge
                  key={s.level}
                  variant="outline"
                  className="text-xs"
                >
                  {s.level}: {s.value}
                </Badge>
              ))}
            </div>
          )}

          {/* History items */}
          {filteredBenchmarks.length > 0 ? (
            <div className="space-y-2">
              {filteredBenchmarks.map((b) => {
                const matchedStandard = metricStandards
                  .filter((s) => b.value >= s.value)
                  .slice(-1)[0];

                return (
                  <Card key={b.id}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold">
                          {b.value}{" "}
                          <span className="text-sm font-normal text-muted-foreground">
                            {b.unit.toLowerCase()}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(b.date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {matchedStandard && (
                          <Badge className={LEVEL_COLORS[matchedStandard.level] ?? ""}>
                            {matchedStandard.level}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {b.unit}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No entries for this metric yet.
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
