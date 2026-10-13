import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  formatValue,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";

export type ActivityItem = {
  id: string;
  value: number;
  date: string | Date;
  isBest: boolean;
  personalBest: {
    id: string;
    name: string;
    unit: PersonalBestUnitValue;
  };
};

export function RecentActivity({ activity }: { activity: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent entries</CardTitle>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing logged yet.{" "}
            <Link
              href="/personal-bests/new"
              className="text-primary underline underline-offset-4"
            >
              Log your first PR
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((item) => (
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
                    {formatDate(item.date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.isBest && <Badge variant="secondary">PR</Badge>}
                  <span className="text-sm font-medium tabular-nums">
                    {formatValue(item.value, item.personalBest.unit)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
