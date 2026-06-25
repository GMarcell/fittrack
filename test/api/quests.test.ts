import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quest: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    stat: {
      update: vi.fn(),
    },
    statHistory: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

// Mock generateQuestsForUser
vi.mock("@/lib/quest", () => ({
  generateQuestsForUser: vi.fn(),
}));

import { generateQuestsForUser } from "@/lib/quest";

describe("GET /api/quests/today", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing quests for today", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    const existingQuests = [
      { id: "q-1", title: "Do push-ups", rewards: [] },
    ];
    (prisma.quest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(existingQuests);

    const { GET } = await import("@/app/api/quests/today/route");
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Do push-ups");
    expect(generateQuestsForUser).not.toHaveBeenCalled();
  });

  it("generates new quests when none exist for today", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    (prisma.quest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (generateQuestsForUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "q-new", title: "New Quest", rewards: [] },
    ]);

    const { GET } = await import("@/app/api/quests/today/route");
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveLength(1);
    expect(generateQuestsForUser).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/quests/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates and returns new quests", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });
    (generateQuestsForUser as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "q-1", title: "Quest 1", rewards: [] },
      { id: "q-2", title: "Quest 2", rewards: [] },
    ]);

    const { POST } = await import("@/app/api/quests/generate/route");
    const response = await POST();
    const body = await response.json();

    expect(body).toHaveLength(2);
  });
});

describe("POST /api/quests/[id]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts an offered quest", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    (prisma.quest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "q-1",
      status: "OFFERED",
      userId: "user-1",
    });

    (prisma.quest.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "q-1",
      status: "PENDING",
      acceptedAt: new Date(),
      rewards: [],
    });

    const { POST } = await import("@/app/api/quests/[id]/accept/route");

    const request = new Request(
      "http://localhost:3000/api/quests/q-1/accept",
      { method: "POST" },
    );

    const response = await POST(request, { params: Promise.resolve({ id: "q-1" }) });
    expect(response.status).toBe(200);
  });

  it("rejects accepting a non-offered quest", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    (prisma.quest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "q-1",
      status: "COMPLETED",
      userId: "user-1",
    });

    const { POST } = await import("@/app/api/quests/[id]/accept/route");

    const request = new Request(
      "http://localhost:3000/api/quests/q-1/accept",
      { method: "POST" },
    );

    const response = await POST(request, { params: Promise.resolve({ id: "q-1" }) });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/quests/[id]/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes a pending quest with stat rewards", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    (prisma.quest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "q-1",
      userId: "user-1",
      title: "Do push-ups",
      status: "PENDING",
      rewards: [
        { type: "STR", completionValue: 3, failurePenalty: 1 },
      ],
    });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    (prisma.quest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "q-1",
      status: "COMPLETED",
      rewards: [],
    });

    const { POST } = await import("@/app/api/quests/[id]/complete/route");

    const request = new Request(
      "http://localhost:3000/api/quests/q-1/complete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request, { params: Promise.resolve({ id: "q-1" }) });
    expect(response.status).toBe(200);
  });
});
