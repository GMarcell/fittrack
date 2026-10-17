// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { SessionRunner, type RunnerExercise } from "@/components/session/session-runner";

const exercises: RunnerExercise[] = [
  {
    id: "ex-1",
    name: "Back squat",
    muscleGroup: "legs",
    unit: "KG",
    targetSets: 3,
    repTarget: "5",
    rpeTarget: "8",
    sets: [
      { id: "s-1", setNumber: 1, weight: 100, reps: 5, rpe: 8 },
      { id: "s-2", setNumber: 2, weight: 100, reps: 5, rpe: 9 },
    ],
    suggestion: null,
  },
];

const completedSession = {
  id: "session-1",
  notes: null,
  sessionType: "Leg day",
  completedAt: "2026-10-14T12:00:00Z",
};

describe("SessionRunner completed recap", () => {
  it("shows sets, tonnage and muscle coverage after finishing", () => {
    render(<SessionRunner session={completedSession} exercises={exercises} plan={null} />);

    expect(screen.getByText("🎉 Session complete")).toBeTruthy();
    expect(screen.getByText("1,000")).toBeTruthy();
    expect(screen.getByText("kg lifted")).toBeTruthy();
    expect(screen.getByText("Legs · 2")).toBeTruthy();
    expect(screen.getByText("View history")).toBeTruthy();
  });

  it("explains a revisited session without new PR data", () => {
    render(<SessionRunner session={completedSession} exercises={exercises} plan={null} />);

    expect(screen.getByText(/This session is in your history/i)).toBeTruthy();
    expect(screen.getByText(/Next time:/i)).toBeTruthy();
  });
});
