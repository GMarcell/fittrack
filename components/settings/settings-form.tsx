"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EquipmentSelect } from "@/components/onboarding/equipment-select";

const TIMEZONES = [
  "UTC",
  "Asia/Jakarta",
  "Asia/Makassar",
  "Asia/Jayapura",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Perth",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export function SettingsForm({
  initialTimezone,
  initialEquipment,
}: {
  initialTimezone: string;
  initialEquipment: string[];
}) {
  const router = useRouter();
  const [timezone, setTimezone] = useState(initialTimezone);
  const [equipment, setEquipment] = useState(initialEquipment);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const timezoneOptions = TIMEZONES.includes(initialTimezone)
    ? TIMEZONES
    : [initialTimezone, ...TIMEZONES];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (equipment.length === 0) {
      setError("Pick at least one equipment option.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone, equipment }),
      });
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string"
            ? body.error
            : "Could not save your settings. Try again.",
        );
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timezone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Used for &quot;today&quot;, streaks and how session dates are grouped.
          </p>
          <Label htmlFor="timezone" className="sr-only">
            Timezone
          </Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone" className="w-full sm:w-72">
              <SelectValue placeholder="Select a timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezoneOptions.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            The coach only programs what you tick here. Update it when your kit changes.
          </p>
          <EquipmentSelect value={equipment} onChange={setEquipment} />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-primary">Settings saved.</p>}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
