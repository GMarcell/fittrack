"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ExercisePicker({
  exercises,
  selectedName,
}: {
  exercises: { name: string; sessions: number }[];
  selectedName: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={selectedName}
      onValueChange={(name) =>
        router.push(`/exercises?name=${encodeURIComponent(name)}`)
      }
    >
      <SelectTrigger className="w-full sm:w-72">
        <SelectValue placeholder="Select an exercise" />
      </SelectTrigger>
      <SelectContent>
        {exercises.map((exercise) => (
          <SelectItem key={exercise.name} value={exercise.name}>
            {exercise.name} · {exercise.sessions}{" "}
            {exercise.sessions === 1 ? "session" : "sessions"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
