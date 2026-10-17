// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push }),
}));

import GoalPage from "@/app/onboarding/goal/page";

describe("onboarding equipment step", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn((input: string, init?: RequestInit) => {
      if (!init || init.method !== "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            goal: "strength",
            experience: "beginner",
            equipment: ["dumbbells", "bench"],
            injuries: null,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows the saved equipment ticked when the step is reopened", async () => {
    render(<GoalPage />);

    await waitFor(() =>
      expect((screen.getByRole("checkbox", { name: "Dumbbells" }) as HTMLInputElement).checked).toBe(true),
    );
    expect((screen.getByRole("checkbox", { name: "Flat bench" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Barbell & plates" }) as HTMLInputElement).checked).toBe(false);
  });

  it("submits every piece of equipment the client selects", async () => {
    render(<GoalPage />);

    await waitFor(() =>
      expect((screen.getByRole("checkbox", { name: "Dumbbells" }) as HTMLInputElement).checked).toBe(true),
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Kettlebell" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to fitness checks" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding/test"));

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post).toBeTruthy();
    expect(JSON.parse(post![1].body as string).equipment).toEqual([
      "dumbbells",
      "bench",
      "kettlebell",
    ]);
  });
});
