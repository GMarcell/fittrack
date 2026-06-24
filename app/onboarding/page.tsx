"use client";

import { useState } from "react";
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

  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const progress = Math.round((step / QUESTIONS.length) * 100);

  function handleNext() {
    if (!selected) return;
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

  async function submitOnboarding(finalResponses: Response[]) {
    setLoading(true);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: finalResponses }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">FitTrack</h1>
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
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
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
                onClick={() => setSelected(opt.band)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                  selected === opt.band
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-muted-foreground bg-card"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setStep((s) => s - 1);
                setSelected(null);
                setResponses((r) => r.slice(0, -1));
              }}
            >
              Back
            </Button>
          )}
          <Button
            className="flex-1"
            disabled={!selected || loading}
            onClick={handleNext}
          >
            {loading ? "Initializing..." : isLast ? "Complete" : "Next"}
          </Button>
        </div>
      </div>
    </main>
  );
}
