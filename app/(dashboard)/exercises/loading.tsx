import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ExercisesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-8 w-full rounded-lg sm:w-72" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}
