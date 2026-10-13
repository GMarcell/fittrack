import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeDays, formatValue, type PersonalBestUnitValue } from "@/lib/personal-best";

export function ConsistencyCard({
  lastPrAt,
  prsLast30Days,
  recordsImprovedLast30Days,
  mostImproved,
}: {
  lastPrAt: Date | null;
  prsLast30Days: number;
  recordsImprovedLast30Days: number;
  mostImproved: {
    name: string;
    delta: number;
    unit: PersonalBestUnitValue;
  } | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Momentum</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Last PR</p>
          <p className="mt-0.5 text-sm font-semibold">
            {lastPrAt ? formatRelativeDays(lastPrAt) : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">PRs · 30 days</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {prsLast30Days}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Records improved</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {recordsImprovedLast30Days}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Most improved</p>
          {mostImproved ? (
            <>
              <p className="mt-0.5 truncate text-sm font-semibold">
                {mostImproved.name}
              </p>
              <p className="text-xs text-muted-foreground">
                +{formatValue(mostImproved.delta, mostImproved.unit)} · 30 days
              </p>
            </>
          ) : (
            <p className="mt-0.5 text-sm font-semibold">—</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
