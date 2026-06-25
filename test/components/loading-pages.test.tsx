// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// Each loading page should render without crashing and contain skeleton elements
describe("Dashboard loading skeleton", () => {
  it("renders without crashing", async () => {
    const mod = await import("@/app/(dashboard)/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    expect(container.firstChild).toBeTruthy();
  });

  it("contains Skeleton elements for goal countdowns", async () => {
    const mod = await import("@/app/(dashboard)/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    // Should have skeleton items (divs with data-slot="skeleton")
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });
});

describe("Sessions loading skeleton", () => {
  it("renders without crashing", async () => {
    const mod = await import("@/app/(dashboard)/sessions/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders session card skeletons", async () => {
    const mod = await import("@/app/(dashboard)/sessions/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Quests loading skeleton", () => {
  it("renders without crashing", async () => {
    const mod = await import("@/app/(dashboard)/quests/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders quest item skeletons", async () => {
    const mod = await import("@/app/(dashboard)/quests/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(10);
  });
});

describe("Goals loading skeleton", () => {
  it("renders without crashing", async () => {
    const mod = await import("@/app/(dashboard)/goals/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders goal card skeletons", async () => {
    const mod = await import("@/app/(dashboard)/goals/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Stats loading skeleton", () => {
  it("renders without crashing", async () => {
    const mod = await import("@/app/(dashboard)/stats/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders stat chart and event skeletons", async () => {
    const mod = await import("@/app/(dashboard)/stats/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(8);
  });
});

describe("New Session loading skeleton", () => {
  it("renders without crashing", async () => {
    const mod = await import("@/app/(dashboard)/sessions/new/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders form field skeletons", async () => {
    const mod = await import("@/app/(dashboard)/sessions/new/loading");
    const Component = mod.default;
    const { container } = render(<Component />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(8);
  });
});

describe("Page exports", () => {
  it("all loading pages export a default function component", async () => {
    const pages = [
      "@/app/(dashboard)/loading",
      "@/app/(dashboard)/sessions/loading",
      "@/app/(dashboard)/quests/loading",
      "@/app/(dashboard)/goals/loading",
      "@/app/(dashboard)/stats/loading",
      "@/app/(dashboard)/sessions/new/loading",
    ];

    for (const page of pages) {
      const mod = await import(page);
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");
    }
  });
});
