"use client";

export function OnboardingResetButton() {
  return (
    <form
      action="/api/onboarding/reset"
      method="POST"
      className="inline"
      onSubmit={(e) => {
        if (
          !confirm(
            "Reset your onboarding so you can re-run the assessment? This keeps your logged personal bests.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
      >
        Reset onboarding
      </button>
    </form>
  );
}
