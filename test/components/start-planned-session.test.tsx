// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import { StartPlannedSession } from "@/components/session/start-planned-session";
import type { PlanDay } from "@/lib/session";

const monday: PlanDay = {
  day: "Monday",
  sessionType: "Upper body",
  warmUp: ["Arm circles"],
  mainWorkout: [
    { exercise: "Dumbbell floor press", sets: 3, reps: "8-12", rpe: "7", muscleGroup: "chest" },
  ],
  cooldown: ["Stretch"],
};

describe("StartPlannedSession", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ session: { id: "session-9" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("creates the session from the chosen plan day and opens it", async () => {
    render(<StartPlannedSession planDay={monday} label="Train Monday today" />);

    fireEvent.click(screen.getByRole("button", { name: "Train Monday today" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/sessions/session-9"));

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      planDay: "Monday",
      sessionType: "Upper body",
    });
    expect(body.exercises).toHaveLength(1);
    expect(body.exercises[0]).toMatchObject({
      name: "Dumbbell floor press",
      unit: "KG",
      targetSets: 3,
      repTarget: "8-12",
    });
  });

  it("shows the API error instead of navigating", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "You already logged sets today" }),
    });

    render(<StartPlannedSession planDay={monday} />);
    fireEvent.click(screen.getByRole("button", { name: "Start Upper body" }));

    await waitFor(() =>
      expect(screen.getByText("You already logged sets today")).toBeTruthy(),
    );
    expect(push).not.toHaveBeenCalled();
  });
});
