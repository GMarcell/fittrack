"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ProgressPicker({
  records,
  selectedId,
}: {
  records: { id: string; name: string }[];
  selectedId: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={selectedId}
      onValueChange={(id) => router.push(`/progress?id=${id}`)}
    >
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue placeholder="Select a record" />
      </SelectTrigger>
      <SelectContent>
        {records.map((record) => (
          <SelectItem key={record.id} value={record.id}>
            {record.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
