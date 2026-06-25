import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findMany: vi.fn(),
      create: vi.fn(),
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

describe("POST /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a session and returns 201", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    const mockSession = {
      id: "session-1",
      date: new Date("2025-01-15"),
      activityTypeId: "at-1",
      userId: "user-1",
      focus: "Upper body",
      duration: 60,
      rpe: 7,
      activityType: { id: "at-1", name: "Weights" },
      goal: null,
      sessionExercises: [],
    };

    (prisma.session.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    // Dynamically import route handler
    const { POST } = await import("@/app/api/sessions/route");

    const request = new Request("http://localhost:3000/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2025-01-15",
        activityTypeId: "at-1",
        focus: "Upper body",
        duration: 60,
        rpe: 7,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe("session-1");
    expect(prisma.session.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          focus: "Upper body",
        }),
      }),
    );
  });

  it("returns 400 for invalid body", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    const { POST } = await import("@/app/api/sessions/route");

    const request = new Request("http://localhost:3000/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ focus: "Missing required fields" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("applies stat boosts when provided", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    (prisma.session.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      focus: "Strength day",
    });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { POST } = await import("@/app/api/sessions/route");

    const request = new Request("http://localhost:3000/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: "2025-01-15",
        activityTypeId: "at-1",
        statBoosts: [{ type: "STR", value: 2 }],
      }),
    });

    await POST(request);

    // Verify stat boosts were applied via transaction
    expect(prisma.$transaction).toHaveBeenCalled();
    const transactionArgs = (prisma.$transaction as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(transactionArgs).toHaveLength(2); // 1 stat update + 1 statHistory create
  });
});

describe("GET /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sessions for the current user", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    const mockSessions = [
      { id: "s-1", date: new Date(), activityType: { name: "Weights" } },
    ];
    (prisma.session.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockSessions);

    const { GET } = await import("@/app/api/sessions/route");

    const request = new Request("http://localhost:3000/api/sessions");
    const response = await GET(request);
    const body = await response.json();

    expect(body).toHaveLength(1);
    expect(body[0].id).toBe("s-1");
    expect(prisma.session.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      }),
    );
  });
});
