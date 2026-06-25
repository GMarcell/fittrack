import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-32 rounded-full" />
      </div>

      {/* Goal countdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-7 w-8 ml-auto" />
                <Skeleton className="h-4 w-14 ml-auto rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-7 w-8 ml-auto" />
                <Skeleton className="h-4 w-14 ml-auto rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Radar + Weekly Progress side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Radar chart skeleton */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <Skeleton className="h-4 w-28" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Weekly progress skeleton */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                <Skeleton className="h-4 w-24" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <Skeleton className="h-9 w-28" />
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
              <Skeleton className="h-3 w-48" />
            </CardContent>
          </Card>

          {/* AI suggestion skeleton */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  <Skeleton className="h-4 w-28" />
                </CardTitle>
                <Skeleton className="h-7 w-36 rounded-lg" />
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Daily Quests skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              <Skeleton className="h-4 w-32" />
            </CardTitle>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-24 rounded-lg" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full shrink-0" />
              </div>
              <Skeleton className="h-8 w-full rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Benchmark chart skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              <Skeleton className="h-4 w-36" />
            </CardTitle>
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}
