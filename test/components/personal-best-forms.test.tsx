// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/personal-bests/new",
}));

import { PersonalBestForm } from "@/components/personal-bests/personal-best-form";
import { LogAttemptForm } from "@/components/personal-bests/log-attempt-form";

describe("PersonalBestForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders both categories and the core fields", () => {
    render(<PersonalBestForm />);

    expect(screen.getByText("Exercise PR")).toBeTruthy();
    expect(screen.getByText("Body metric")).toBeTruthy();
    expect(screen.getByLabelText("Value")).toBeTruthy();
    expect(screen.getByLabelText("Record")).toBeTruthy();
  });

  it("offers target fields for every record", () => {
    render(<PersonalBestForm />);

    expect(screen.getByLabelText("Target (optional)")).toBeTruthy();
    expect(screen.getByLabelText("Target date (optional)")).toBeTruthy();
  });

  it("does not ask for reps on a reps-based record", () => {
    render(<PersonalBestForm />);

    // The default exercise record is scored in reps, so weight x reps is moot.
    expect(screen.queryByLabelText("Reps performed (optional)")).toBeNull();
  });

  it("blocks submission and explains what is missing", () => {
    render(<PersonalBestForm />);

    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    expect(screen.getByText("Pick a preset or name your own.")).toBeTruthy();
    expect(screen.getByText("Value is required.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("treats an untouched target as optional", () => {
    render(<PersonalBestForm />);

    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    // Required fields complain; the optional target must not.
    expect(screen.getByText("Value is required.")).toBeTruthy();
    expect(screen.queryByText("Target must be a number.")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses numeric inputs so only numbers can be entered", () => {
    render(<PersonalBestForm />);

    // Browsers sanitise type=number fields, which is why the form's
    // "Target must be a number" branch is defensive only.
    expect(screen.getByLabelText("Target (optional)").getAttribute("type")).toBe(
      "number",
    );
    expect(screen.getByLabelText("Value").getAttribute("type")).toBe("number");
  });
});

describe("LogAttemptForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("asks for reps on a weighted record and previews the 1RM", () => {
    render(
      <LogAttemptForm
        personalBestId="pb-1"
        direction="HIGHER"
        unit="KG"
        bestValue={115}
      />,
    );

    expect(screen.getByText(/Current best:/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "+ Log new entry" }));

    fireEvent.change(screen.getByLabelText("Value (kg)"), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText("Reps"), {
      target: { value: "5" },
    });

    // 100 * (1 + 5/30) = 116.7
    expect(screen.getByText(/Estimated 1RM:/)).toBeTruthy();
    expect(screen.getByText("116.7 kg")).toBeTruthy();
  });

  it("does not ask for reps on a reps-based record", () => {
    render(
      <LogAttemptForm
        personalBestId="pb-1"
        direction="HIGHER"
        unit="REPS"
        bestValue={47}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Log new entry" }));

    expect(screen.getByLabelText("Value (reps)")).toBeTruthy();
    expect(screen.queryByLabelText("Reps")).toBeNull();
  });

  it("explains a lower-is-better record", () => {
    render(
      <LogAttemptForm
        personalBestId="pb-1"
        direction="LOWER"
        unit="MINUTES"
        bestValue={24.8}
      />,
    );

    expect(screen.getByText(/lower is better/)).toBeTruthy();
  });

  it("shows the current value rather than a best for body metrics", () => {
    render(
      <LogAttemptForm
        personalBestId="pb-1"
        direction="LATEST"
        unit="KG"
        bestValue={76.2}
      />,
    );

    expect(screen.getByText(/Current value:/)).toBeTruthy();
  });

  it("refuses to submit a non-numeric value", () => {
    render(
      <LogAttemptForm
        personalBestId="pb-1"
        direction="HIGHER"
        unit="KG"
        bestValue={115}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Log new entry" }));
    fireEvent.change(screen.getByLabelText("Value (kg)"), {
      target: { value: "heavy" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));

    expect(screen.getByText("Enter a number.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
});
