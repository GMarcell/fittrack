import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";
import { chatCompletion } from "@/lib/groq";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    personalBest: { findMany: vi.fn() },
    trainingPlan: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/groq", () => ({
  chatCompletion: vi.fn(),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const generatedPlan = {
  goal: "strength",
  experience: "beginner",
  equipment: "whatever the model guessed",
  weeklySchedule: [
    {
      day: "Monday",
      sessionType: "Upper body",
      warmUp: ["Arm circles"],
      mainWorkout: [
        {
          exercise: "Dumbbell floor press",
          sets: 3,
          reps: "8-12",
          rpe: "7",
          notes: "",
          muscleGroup: "chest",
        },
      ],
      cooldown: ["Stretch"],
    },
  ],
  notes: "Keep it simple.",
};

function planRequest() {
  return new Request("http://localhost/api/onboarding/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exerciseIds: ["max_pushups"] }),
  });
}

describe("POST /api/onboarding/plan equipment matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
    asMock(prisma.user.findUnique).mockResolvedValue({
      fitnessGoal: "strength",
      experienceLevel: "beginner",
      equipment: "dumbbells,bench",
      injuries: null,
    });
    asMock(prisma.personalBest.findMany).mockResolvedValue([]);
    asMock(prisma.trainingPlan.create).mockResolvedValue({ id: "plan-1" });
    asMock(prisma.user.update).mockResolvedValue({ id: "user-1" });
    asMock(chatCompletion).mockResolvedValue(JSON.stringify(generatedPlan));
  });

  it("tells the generator exactly which equipment is available", async () => {
    const { POST } = await import("@/app/api/onboarding/plan/route");

    const response = await POST(planRequest());
    expect(response.status).toBe(200);

    const messages = asMock(chatCompletion).mock.calls[0][0] as Array<{ content: string }>;
    const prompt = messages.map((m) => m.content).join("\n");
    expect(prompt).toContain("Equipment I have: Dumbbells, Flat bench");
    expect(prompt).toContain("Never program a barbell, rack, bench");
  });

  it("stores the plan against the client's equipment, not the model's echo", async () => {
    const { POST } = await import("@/app/api/onboarding/plan/route");

    await POST(planRequest());

    const stored = asMock(prisma.trainingPlan.create).mock.calls[0][0].data;
    expect(stored.equipment).toBe("Dumbbells, Flat bench");

    const planJson = JSON.parse(stored.planJson as string);
    expect(planJson.equipment).toBe("Dumbbells, Flat bench");
  });
});
