"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS, type AnswerBand } from "@/lib/onboarding";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Response = { questionKey: string; rawAnswer: AnswerBand };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Response[]>([]);
  const [selected, setSelected] = useState<AnswerBand | null>(null);
  const [loading, setLoading] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const progress = Math.round((step / QUESTIONS.length) * 100);

  // Global Enter key to proceed
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && !loading && selected) {
        handleNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function handleSelect(band: AnswerBand) {
    setSelected(band);
    setTriedSubmit(false);
  }

  function handleNext() {
    if (!selected) {
      setTriedSubmit(true);
      return;
    }
    setTriedSubmit(false);
    const updated = [
      ...responses,
      { questionKey: question.key, rawAnswer: selected },
    ];
    setResponses(updated);
    setSelected(null);

    if (isLast) {
      submitOnboarding(updated);
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleBack() {
    setStep((s) => s - 1);
    setSelected(null);
    setResponses((r) => r.slice(0, -1));
    setTriedSubmit(false);
    setSubmitError("");
  }

  async function submitOnboarding(finalResponses: Response[]) {
    setLoading(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: finalResponses }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));
      setSubmitError(
        typeof data.error === "string"
          ? data.error
          : "Failed to save your stats. Please try again.",
      );
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  }



  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2.5">
            <div className="size-3 rounded-full bg-primary shadow-lg shadow-primary/40" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              FitTrack
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            The System is initializing your stats...
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Step {step + 1} of {QUESTIONS.length}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-500 shadow-lg shadow-primary/30"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card with shake on error */}
        <div className={triedSubmit ? "animate-[shake_0.4s_ease-in-out]" : ""}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base leading-snug">
                {question.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {question.options.map((opt) => (
                <button
                  key={opt.band}
                  type="button"
                  onClick={() => handleSelect(opt.band)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all duration-150 ${
                    selected === opt.band
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border hover:border-muted-foreground hover:bg-accent/30 bg-card"
                  } ${
                    triedSubmit && !selected
                      ? "border-destructive/50"
                      : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Validation hint */}
        {triedSubmit && !selected && (
          <p className="text-destructive text-xs text-center animate-[fade-in_0.2s_ease-in]">
            Please select an option before continuing
          </p>
        )}

        {/* Submit error */}
        {submitError && (
          <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
            <span className="text-red-500 text-sm mt-0.5">⚠</span>
            <p className="text-xs text-red-600 dark:text-red-400 flex-1">{submitError}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              className="flex-1"
              disabled={loading}
              onClick={handleBack}
            >
              Back
            </Button>
          )}
          <Button
            className={`flex-1 ${step === 0 ? "w-full" : ""}`}
            disabled={loading}
            onClick={handleNext}
          >
            {loading
              ? "Initializing..."
              : isLast
                ? "Complete"
                : "Next"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground/60">
          Press <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">Enter</kbd> to continue
        </p>
      </div>
    </main>
  );
}
