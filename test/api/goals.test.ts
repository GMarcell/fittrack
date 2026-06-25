import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    goal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

describe("POST /api/goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a goal and returns 201", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    const mockGoal = {
      id: "goal-1",
      userId: "user-1",
      name: "Run 5k in 25 min",
      priority: "PRIMARY",
      status: "ACTIVE",
    };

    (prisma.goal.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockGoal);

    const { POST } = await import("@/app/api/goals/route");

    const request = new Request("http://localhost:3000/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Run 5k in 25 min", priority: "PRIMARY" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.name).toBe("Run 5k in 25 min");
  });

  it("returns 400 for invalid body", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    const { POST } = await import("@/app/api/goals/route");

    const request = new Request("http://localhost:3000/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});

describe("GET /api/goals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns goals filtered by status", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    (prisma.goal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "g-1", name: "Test Goal", status: "ACTIVE" },
    ]);

    const { GET } = await import("@/app/api/goals/route");

    const request = new Request("http://localhost:3000/api/goals?status=active");
    const response = await GET(request);
    const body = await response.json();

    expect(body).toHaveLength(1);
    expect(prisma.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
  });

  it("returns all goals when status=all", async () => {
    (auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
    });

    (prisma.goal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { GET } = await import("@/app/api/goals/route");

    const request = new Request("http://localhost:3000/api/goals?status=all");
    await GET(request);

    expect(prisma.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
      }),
    );
    // Should not filter by status when "all"
    const whereArg = (prisma.goal.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0][0].where;
    expect(whereArg).not.toHaveProperty("status");
  });
});
