import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exercise: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    activityType: {
      findMany: vi.fn(),
    },
    benchmark: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    fitnessStandard: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

describe("GET /api/exercises", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns exercises for current user", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });
    (prisma.exercise.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "ex-1", name: "Bench Press", category: "STRENGTH" },
    ]);

    const { GET } = await import("@/app/api/exercises/route");
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Bench Press");
  });

  it("returns 401 when not authenticated", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Not authenticated"),
    );

    const { GET } = await import("@/app/api/exercises/route");
    await expect(GET()).rejects.toThrow("Not authenticated");
  });
});

describe("POST /api/exercises", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an exercise and returns 201", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });
    (prisma.exercise.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "ex-1",
      name: "Bench Press",
      category: "STRENGTH",
      unit: "KG",
    });

    const { POST } = await import("@/app/api/exercises/route");

    const request = new Request("http://localhost:3000/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bench Press",
        category: "STRENGTH",
        unit: "KG",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.name).toBe("Bench Press");
  });
});

describe("GET /api/activity-types", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns activity types for current user", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });
    (prisma.activityType.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "at-1", name: "Weights" },
      { id: "at-2", name: "Cardio" },
    ]);

    const { GET } = await import("@/app/api/activity-types/route");
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveLength(2);
  });
});

describe("POST /api/benchmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a benchmark and returns 201", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });
    (prisma.benchmark.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "bm-1",
      metric: "Push-ups",
      value: 50,
      unit: "REPS",
    });

    const { POST } = await import("@/app/api/benchmarks/route");

    const request = new Request("http://localhost:3000/api/benchmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metric: "Push-ups",
        value: 50,
        unit: "REPS",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.metric).toBe("Push-ups");
  });
});
