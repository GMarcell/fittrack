import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  formatRelativeDays,
  formatValue,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";

export type PrFeedItem = {
  id: string;
  value: number;
  previousValue: number | null;
  date: string | Date;
  personalBest: {
    id: string;
    name: string;
    unit: PersonalBestUnitValue;
  };
};

/** Gap between the old and new best, always shown as a positive improvement. */
function improvement(item: PrFeedItem): number | null {
  if (item.previousValue === null) return null;
  const delta = Math.abs(item.value - item.previousValue);
  return Math.round(delta * 100) / 100;
}

export function PrFeed({ achievements }: { achievements: PrFeedItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">PRs broken</CardTitle>
          {achievements.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {achievements.length} recent
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No records broken yet — your first big entry will show up here.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {achievements.map((item) => {
              const delta = improvement(item);
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/personal-bests/${item.personalBest.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {item.personalBest.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(item.date)} · {formatRelativeDays(item.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {delta === null ? (
                      <Badge variant="outline">First entry</Badge>
                    ) : (
                      <Badge variant="secondary">
                        +{formatValue(delta, item.personalBest.unit)}
                      </Badge>
                    )}
                    <span className="text-sm font-medium tabular-nums">
                      {formatValue(item.value, item.personalBest.unit)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
