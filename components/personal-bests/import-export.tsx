"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ImportSummary = {
  recordsCreated: number;
  recordsUpdated: number;
  entriesImported: number;
  achievements: number;
  duplicates: number;
  skipped: number;
};

export function ImportExport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [failure, setFailure] = useState("");

  async function handleFile(file: File) {
    setBusy(true);
    setSummary(null);
    setErrors([]);
    setFailure("");

    try {
      const csv = await file.text();
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFailure(
          typeof data.error === "string" ? data.error : "Import failed.",
        );
        setBusy(false);
        return;
      }

      setSummary(data.summary as ImportSummary);
      setErrors((data.errors as string[]) ?? []);
      setBusy(false);
      router.refresh();
    } catch {
      setFailure("Could not read that file.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/api/export" download>
            Export CSV
          </a>
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Importing…" : "Import CSV"}
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Import expects the same columns the export produces:{" "}
        <code className="text-[11px]">
          name, type, unit, direction, value, reps, date, notes
        </code>
        . Only name, value and date are required. Re-importing the same file is
        safe — entries you already have are skipped.
      </p>

      {failure && <p className="text-xs text-destructive">{failure}</p>}

      {summary && (
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <p className="text-foreground">
            Imported {summary.entriesImported} entries —{" "}
            {summary.recordsCreated} new record
            {summary.recordsCreated === 1 ? "" : "s"},{" "}
            {summary.recordsUpdated} updated, {summary.achievements} PR
            {summary.achievements === 1 ? "" : "s"} rebuilt
            {summary.duplicates > 0
              ? `, ${summary.duplicates} already present`
              : ""}
            {summary.skipped > 0 ? `, ${summary.skipped} skipped` : ""}.
          </p>
          {errors.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-muted-foreground">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
