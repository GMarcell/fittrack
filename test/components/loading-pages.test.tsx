// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

const PAGES = [
  { name: "Dashboard", module: "@/app/(dashboard)/loading", minSkeletons: 5 },
  {
    name: "Personal bests list",
    module: "@/app/(dashboard)/personal-bests/loading",
    minSkeletons: 5,
  },
  {
    name: "Personal best detail",
    module: "@/app/(dashboard)/personal-bests/[id]/loading",
    minSkeletons: 5,
  },
  {
    name: "Body metrics",
    module: "@/app/(dashboard)/body-metrics/loading",
    minSkeletons: 5,
  },
  {
    name: "Progress",
    module: "@/app/(dashboard)/progress/loading",
    minSkeletons: 3,
  },
];

describe("loading skeletons", () => {
  for (const page of PAGES) {
    it(`${page.name} renders skeletons without crashing`, async () => {
      const mod = await import(page.module);
      const Component = mod.default;

      expect(typeof Component).toBe("function");

      const { container } = render(<Component />);

      expect(container.firstChild).toBeTruthy();
      const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBeGreaterThanOrEqual(page.minSkeletons);
    });
  }
});
