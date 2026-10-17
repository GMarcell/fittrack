import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/onboarding/assessment", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const goalBody = {
  goal: "strength",
  experience: "beginner",
  equipment: ["bench", "dumbbells", "bench"],
  injuries: null,
  step: "goal",
};

function mockTransaction() {
  const tx = { user: { update: vi.fn().mockResolvedValue({ id: "user-1" }) } };
  asMock(prisma.$transaction).mockImplementation(
    async (fn: (client: typeof tx) => unknown) => fn(tx),
  );
  return tx;
}

describe("onboarding assessment equipment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
  });

  it("stores a deduped, ordered equipment list", async () => {
    const tx = mockTransaction();
    const { POST } = await import("@/app/api/onboarding/assessment/route");

    const response = await POST(jsonRequest(goalBody));

    expect(response.status).toBe(200);
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ equipment: "dumbbells,bench" }),
      }),
    );
  });

  it("still accepts the old single equipment value", async () => {
    const tx = mockTransaction();
    const { POST } = await import("@/app/api/onboarding/assessment/route");

    const response = await POST(jsonRequest({ ...goalBody, equipment: "full_gym" }));

    expect(response.status).toBe(200);
    const stored = tx.user.update.mock.calls[0][0].data.equipment as string;
    expect(stored).toContain("barbell");
    expect(stored).toContain("bench");
    expect(stored).not.toContain("full_gym");
  });

  it("rejects an empty equipment selection", async () => {
    const { POST } = await import("@/app/api/onboarding/assessment/route");

    const response = await POST(jsonRequest({ ...goalBody, equipment: [] }));

    expect(response.status).toBe(400);
  });

  it("returns the saved answers for the prefill form", async () => {
    asMock(prisma.user.findUnique).mockResolvedValue({
      fitnessGoal: "hypertrophy",
      experienceLevel: "intermediate",
      equipment: "dumbbells,bench",
      injuries: "sore knee",
      onboardingCompleted: true,
    });
    const { GET } = await import("@/app/api/onboarding/assessment/route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      goal: "hypertrophy",
      experience: "intermediate",
      equipment: ["dumbbells", "bench"],
      injuries: "sore knee",
    });
    expect(body.exercises).toHaveLength(4);
    expect(body.exercises[body.exercises.length - 1].id).toBe("bodyweight");
    expect(body.exercises.map((e: { id: string }) => e.id)).toContain("farmer_carry");
  });

  it("returns 401 when unauthenticated", async () => {
    asMock(auth.getCurrentUser).mockResolvedValue(null);
    const { GET, POST } = await import("@/app/api/onboarding/assessment/route");

    expect((await GET()).status).toBe(401);
    expect((await POST(jsonRequest(goalBody))).status).toBe(401);
  });
});
