"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FITNESS_GOALS,
  EXPERIENCE_LEVELS,
  parseEquipment,
} from "@/lib/onboarding";
import { EquipmentSelect } from "@/components/onboarding/equipment-select";

export default function GoalPage() {
  const router = useRouter();
  const [goal, setGoal] = useState<string>("");
  const [experience, setExperience] = useState<string>("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [injuries, setInjuries] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Coming back via "Change goals / equipment" should show the saved answers.
  useEffect(() => {
    let active = true;
    fetch("/api/onboarding/assessment")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: {
          goal?: string | null;
          experience?: string | null;
          equipment?: string[] | string | null;
          injuries?: string | null;
        } | null) => {
          if (!active || !data) return;
          if (data.goal) setGoal(data.goal);
          if (data.experience) setExperience(data.experience);
          setEquipment(
            Array.isArray(data.equipment)
              ? parseEquipment(data.equipment.join(","))
              : parseEquipment(data.equipment),
          );
          if (data.injuries) setInjuries(data.injuries);
        },
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal || !experience || equipment.length === 0) {
      setError("Please answer all required questions.");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/onboarding/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal,
        experience,
        equipment,
        injuries: injuries.trim() || null,
        step: "goal",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Something went wrong." }));
      setError(typeof data.error === "string" ? data.error : "Could not save. Try again.");
      setLoading(false);
      return;
    }

    router.push("/onboarding/test");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Step 1 of 2 · Your goals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>What’s your main goal right now?</Label>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {FITNESS_GOALS.map((g) => (
                  <label
                    key={g.value}
                    className="flex items-start gap-3 rounded-xl border border-input bg-background/50 p-3 text-sm cursor-pointer transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="goal"
                      value={g.value}
                      checked={goal === g.value}
                      onChange={() => setGoal(g.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-medium">{g.label}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{g.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Experience level</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {EXPERIENCE_LEVELS.map((l) => (
                  <label
                    key={l.value}
                    className="flex items-center gap-2 rounded-lg border border-input bg-background/50 p-3 text-sm cursor-pointer transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="experience"
                      value={l.value}
                      checked={experience === l.value}
                      onChange={() => setExperience(l.value)}
                      className="mt-0.5"
                    />
                    {l.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>What equipment do you have access to?</Label>
              <p className="mt-1 text-xs text-muted-foreground">
                Tick everything you can use — your training menu will only include
                exercises you can actually do.
              </p>
              <EquipmentSelect value={equipment} onChange={setEquipment} />
            </div>

            <div>
              <Label htmlFor="injuries">Injuries, niggles or anything I should work around?</Label>
              <Textarea
                id="injuries"
                placeholder="e.g. sore left knee, lower back tightness…"
                value={injuries}
                onChange={(e) => setInjuries(e.target.value)}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-destructive text-sm flex items-center gap-1.5">
                <span>⚠</span>
                <span>{error}</span>
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Saving…" : "Continue to fitness checks"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
