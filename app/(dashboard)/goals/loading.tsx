import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GoalsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-20" />

      {/* Active goals section */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 flex-1">
                  <CardTitle className="text-base">
                    <Skeleton className="h-4 w-44" />
                  </CardTitle>
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20 rounded-lg" />
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Archived goals section */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Card className="opacity-60">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <CardTitle className="text-base">
                  <Skeleton className="h-4 w-36" />
                </CardTitle>
              </div>
              <Skeleton className="h-5 w-20 rounded-full shrink-0" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-5 w-32 rounded-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
