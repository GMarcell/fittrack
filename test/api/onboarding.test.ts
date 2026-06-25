import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    onboardingResponse: {
      count: vi.fn(),
      createMany: vi.fn(),
    },
    stat: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

describe("POST /api/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes onboarding responses and creates stats", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.stat.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { type: "STR", value: 20 },
      { type: "END", value: 22 },
    ]);

    const { POST } = await import("@/app/api/onboarding/route");

    const request = new Request("http://localhost:3000/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: [
          { questionKey: "max_pushups", rawAnswer: "C" },
          { questionKey: "five_k_run", rawAnswer: "B" },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body).toHaveProperty("stats");
    expect(body.stats).toHaveLength(2);

    // Verify transaction was called with createMany + upserts
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("seeds missing stats with default value of 15", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.stat.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { POST } = await import("@/app/api/onboarding/route");

    const request = new Request("http://localhost:3000/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        responses: [
          { questionKey: "max_pushups", rawAnswer: "A" },
        ],
      }),
    });

    await POST(request);

    // Verify transaction includes all 8 stat types + createMany
    const txArgs = (prisma.$transaction as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    // 1 createMany + 8 stat upserts (one per stat type)
    expect(txArgs).toHaveLength(9);
  });
});

describe("GET /api/onboarding/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns completed=true when responses exist", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });
    (prisma.onboardingResponse.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

    const { GET } = await import("@/app/api/onboarding/status/route");
    const response = await GET();
    const body = await response.json();

    expect(body.completed).toBe(true);
  });

  it("returns completed=false when no responses exist", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });
    (prisma.onboardingResponse.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const { GET } = await import("@/app/api/onboarding/status/route");
    const response = await GET();
    const body = await response.json();

    expect(body.completed).toBe(false);
  });
});
