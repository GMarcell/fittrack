"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ASSESSMENT_EXERCISES } from "@/lib/onboarding";

type TestStep = "prompt" | "input" | "saving" | "generating" | "plan";

export default function TestPage() {
  const router = useRouter();
  const [step, setStep] = useState<TestStep>("prompt");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [planHtml, setPlanHtml] = useState<string | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [loadingRegenerate, setLoadingRegenerate] = useState(false);
  const [failedExercise, setFailedExercise] = useState<string | null>(null);

  const exercise = ASSESSMENT_EXERCISES[exerciseIndex];
  const isLast = exerciseIndex === ASSESSMENT_EXERCISES.length - 1;

  useEffect(() => {
    setValue("");
    setError("");
    setFailedExercise(null);
  }, [exerciseIndex]);

  useEffect(() => {
    if (step !== "plan") return;
    fetch("/api/onboarding/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseIds: ASSESSMENT_EXERCISES.map((e) => e.id) }),
    })
      .then((r) => r.json())
      .then((data) => {
        setPlanLoaded(true);
        setPlanHtml((data as { planHtml?: string }).planHtml ?? null);
      })
      .catch(() => {
        setPlanLoaded(true);
        setPlanHtml(null);
      });
  }, [step]);

  function handleStart() {
    setStep("prompt");
    setExerciseIndex(0);
  }

  async function handleSave() {
    if (!value || isNaN(Number(value)) || Number(value) <= 0) {
      setError("Enter a positive number.");
      return;
    }
    setStep("saving");
    setError("");

    const res = await fetch("/api/onboarding/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId: exercise.id,
        value: Number(value),
        step: "test",
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Could not log that. Try again." }));
      setError(typeof data.error === "string" ? data.error : "Could not log that. Try again.");
      setStep("input");
      return;
    }

    // Advance to next exercise, or generate the plan.
    if (isLast) {
      setStep("generating");
      await generatePlan();
    } else {
      setExerciseIndex((i) => i + 1);
      setStep("prompt");
    }
  }  async function generatePlan() {
    setLoadingRegenerate(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseIds: ASSESSMENT_EXERCISES.map((e) => e.id) }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Plan generation failed. Try again."}));
        setError(typeof data.error === "string" ? data.error : "Plan generation failed. Try again.");
        setStep("input");
        return;
      }

      const data = (await res.json()) as { planHtml?: string; planText?: string };
      setPlanHtml(data.planHtml ?? data.planText ?? "Plan generated — see the dashboard for your training menu.");
      setStep("plan");
    } finally {
      setLoadingRegenerate(false);
    }
  }

  function renderPrompt() {
    if (!exercise) return null;
    return (
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Exercise {exerciseIndex + 1} of {ASSESSMENT_EXERCISES.length}
        </p>
        <h2 className="text-xl font-semibold">{exercise.name}</h2>
        <p className="text-sm">{exercise.instructions}</p>
        {exercise.rest && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            Rest {exercise.rest} before logging your result.
          </p>
        )}
        <Button className="w-full" size="lg" onClick={() => setStep("input")}>
          I’m ready — take the test
        </Button>
      </div>
    );
  }

  function renderInput() {
    if (!exercise) return null;
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">Exercise {exerciseIndex + 1} of {ASSESSMENT_EXERCISES.length}</p>
          <h2 className="text-xl font-semibold">{exercise.name}</h2>
        </div>

        {failedExercise ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive space-y-2">
            <p className="font-medium">Couldn’t log that attempt</p>
            <p>{failedExercise}</p>
            <Button variant="outline" className="w-full" size="sm" onClick={() => { setFailedExercise(null); setStep("input"); }}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Your result</Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder={exercise.unit === "SECONDS" ? "e.g. 45" : exercise.unit === "KG" ? "e.g. 75.5" : "e.g. 25"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={`${exercise.name} result`}
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              {exercise.unit === "SECONDS" ? "Enter seconds" : exercise.unit === "KG" ? "Enter kg" : "Enter reps"}
            </p>
          </div>
        )}

        {error && (
          <p className="text-destructive text-sm flex items-center gap-1.5">
            <span>⚠</span>
            <span>{error}</span>
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" size="lg" onClick={() => setStep("prompt")}>
            Back to instructions
          </Button>
          <Button className="flex-1" size="lg" disabled={loading} onClick={handleSave}>
            {loading ? "Logging…" : "Log result"}
          </Button>
        </div>
      </div>
    );
  }

  function renderGenerating() {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary">
          <svg className="size-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold">Building your plan…</h2>
        <p className="text-sm text-muted-foreground">
          I’m reading your assessment numbers and putting together a weekly training menu.
        </p>
      </div>
    );
  }

  function renderPlan() {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-semibold">Your training menu is ready</h2>
          <p className="text-sm text-muted-foreground">
            You can change it anytime from the dashboard.
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="pt-4">
            <div
              className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm"
              dangerouslySetInnerHTML={{ __html: planHtml ?? "" }}
            />
          </CardContent>
        </Card>

        {error && (
          <p className="text-destructive text-sm flex items-center gap-1.5">
            <span>⚠</span>
            <span>{error}</span>
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" size="lg" disabled={loadingRegenerate} onClick={generatePlan}>
            {loadingRegenerate ? "Regenerating…" : "Regenerate"}
          </Button>            <Button className="flex-1" size="lg" asChild>
            <a href="/">
              Go to dashboard
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-8rem)] items-center justify-center p-4">
      <Card className="w-full max-w-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Step 2 of 2 · Fitness checks</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {step === "prompt" && renderPrompt()}
          {step === "input" && renderInput()}
          {step === "saving" && (
            <div className="text-center space-y-3 py-6">
              <div className="inline-flex items-center justify-center size-12 rounded-full bg-primary/10 text-primary">
                <svg className="size-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
              <p className="text-sm">Logging your result…</p>
            </div>
          )}
          {step === "generating" && renderGenerating()}
          {step === "plan" && renderPlan()}
        </CardContent>
      </Card>
    </div>
  );
}
