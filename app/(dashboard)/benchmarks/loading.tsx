import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function BenchmarksLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />

      {/* Action bar */}
      <div className="flex justify-end">
        <Skeleton className="h-7 w-36 rounded-lg" />
      </div>

      {/* Metric pills */}
      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>

      {/* Best value banner */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* History items */}
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
