// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { Skeleton } from "@/components/ui/skeleton";

describe("Skeleton", () => {
  function getSkeleton(container: HTMLElement) {
    return container.querySelector('[data-slot="skeleton"]') as HTMLElement;
  }

  it("renders as a div element", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.tagName).toBe("DIV");
  });

  it("has aria-hidden=true", () => {
    const { container } = render(<Skeleton />);
    const el = getSkeleton(container);
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("has data-slot='skeleton'", () => {
    const { container } = render(<Skeleton />);
    const el = getSkeleton(container);
    expect(el.getAttribute("data-slot")).toBe("skeleton");
  });

  it("applies additional className", () => {
    const { container } = render(<Skeleton className="extra-class" />);
    const el = getSkeleton(container);
    expect(el.className).toContain("extra-class");
  });

  it("has the shimmer animation class", () => {
    const { container } = render(<Skeleton />);
    const el = getSkeleton(container);
    expect(el.className).toContain("animate-[shimmer");
  });

  it("has the gradient background classes", () => {
    const { container } = render(<Skeleton />);
    const el = getSkeleton(container);
    expect(el.className).toContain("bg-[length:200%_100%]");
    expect(el.className).toContain("bg-[linear-gradient");
  });

  it("has the base rounded and muted background", () => {
    const { container } = render(<Skeleton />);
    const el = getSkeleton(container);
    expect(el.className).toContain("rounded-lg");
    expect(el.className).toContain("bg-muted");
  });

  it("renders with custom styles via props", () => {
    const { container } = render(<Skeleton style={{ width: 100, height: 20 }} />);
    const el = getSkeleton(container);
    expect(el.style.width).toBe("100px");
    expect(el.style.height).toBe("20px");
  });

  it("passes additional props to the div", () => {
    const { container } = render(<Skeleton id="test-id" />);
    const el = getSkeleton(container);
    expect(el.id).toBe("test-id");
  });
});
