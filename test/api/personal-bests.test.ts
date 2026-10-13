import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personalBest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    attempt: { create: vi.fn(), updateMany: vi.fn(), delete: vi.fn() },
    achievement: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function jsonRequest(url: string, body?: unknown, method = "POST") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const validBody = {
  type: "EXERCISE",
  name: "Max Push-ups",
  value: 45,
  unit: "REPS",
  date: "2026-04-01",
};

/** Transaction mock with the calls `logEntry` makes. */
function mockTransaction() {
  const tx = {
    personalBest: {
      create: vi.fn().mockResolvedValue({ id: "pb-new" }),
      update: vi.fn().mockResolvedValue({ id: "pb-1", bestValue: 45 }),
      findUnique: vi.fn(),
    },
    attempt: {
      create: vi.fn().mockResolvedValue({ id: "a-new" }),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    achievement: { create: vi.fn().mockResolvedValue({ id: "ach-1" }) },
  };

  asMock(prisma.$transaction).mockImplementation(
    async (fn: (client: typeof tx) => unknown) => fn(tx),
  );

  return tx;
}

describe("POST /api/personal-bests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
  });

  it("returns 401 when unauthenticated", async () => {
    asMock(auth.getCurrentUser).mockResolvedValue(null);

    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", validBody),
    );

    expect(response.status).toBe(401);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid payload", async () => {
    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        unit: "STONES",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("creates the record, establishes the best and records an achievement", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue(null);
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", validBody),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.isPersonalBest).toBe(true);

    expect(tx.personalBest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          name: "Max Push-ups",
          unit: "REPS",
          direction: "HIGHER",
          bestValue: 45,
        }),
      }),
    );
    expect(tx.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 45, isBest: true }),
      }),
    );
    expect(tx.achievement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 45, previousValue: null }),
      }),
    );
  });

  it("promotes an existing record and records the previous best", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue({
      id: "pb-1",
      name: "Max Push-ups",
      unit: "REPS",
      direction: "HIGHER",
      bestValue: 40,
      verified: false,
    });
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", validBody),
    );
    const body = await response.json();

    expect(body.isPersonalBest).toBe(true);
    expect(body.previousValue).toBe(40);
    expect(tx.achievement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 45, previousValue: 40 }),
      }),
    );
    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bestValue: 45 }),
      }),
    );
  });

  it("records a weaker entry without a new best or achievement", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue({
      id: "pb-1",
      name: "Max Push-ups",
      unit: "REPS",
      direction: "HIGHER",
      bestValue: 40,
      verified: false,
    });
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        value: 30,
      }),
    );
    const body = await response.json();

    expect(body.isPersonalBest).toBe(false);
    expect(tx.achievement.create).not.toHaveBeenCalled();
    expect(tx.attempt.updateMany).not.toHaveBeenCalled();
  });

  it("establishes a timed record without being beaten by its own baseline", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue(null);
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        name: "5km Run",
        unit: "MINUTES",
        value: 26,
      }),
    );

    expect(response.status).toBe(201);
    expect(tx.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isBest: true, value: 26 }),
      }),
    );
    expect(tx.achievement.create).toHaveBeenCalled();
  });

  it("treats a longer hold as a new best even though the unit is seconds", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue({
      id: "pb-hold",
      name: "Plank Hold",
      unit: "SECONDS",
      direction: "HIGHER",
      bestValue: 120,
      verified: false,
    });
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        name: "Plank Hold",
        unit: "SECONDS",
        value: 142,
      }),
    );
    const body = await response.json();

    expect(body.isPersonalBest).toBe(true);
    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bestValue: 142 }),
      }),
    );
  });

  it("stores reps and derives an estimated one-rep max", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue(null);
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/personal-bests/route");
    await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        name: "Deadlift",
        unit: "KG",
        value: 100,
        reps: 5,
      }),
    );

    const attemptArgs = tx.attempt.create.mock.calls[0][0];
    expect(attemptArgs.data.reps).toBe(5);
    // 100 * (1 + 5/30) = 116.7
    expect(attemptArgs.data.estimatedOneRep).toBe(116.7);
  });

  it("stores a target on a new record", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue(null);
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/personal-bests/route");
    await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        targetValue: 60,
        targetDate: "2026-12-01",
      }),
    );

    const createArgs = tx.personalBest.create.mock.calls[0][0];
    expect(createArgs.data.targetValue).toBe(60);
    expect(createArgs.data.targetDate).toBeInstanceOf(Date);
  });

  it("never records achievements for body metrics", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue({
      id: "pb-weight",
      name: "Bodyweight",
      unit: "KG",
      direction: "LATEST",
      bestValue: 77,
      verified: false,
    });
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        type: "BODY_METRIC",
        name: "Bodyweight",
        unit: "KG",
        value: 76.2,
      }),
    );
    const body = await response.json();

    expect(body.isPersonalBest).toBe(false);
    expect(tx.achievement.create).not.toHaveBeenCalled();
    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bestValue: 76.2 }),
      }),
    );
  });

  it("rejects an entry that uses a different unit than the existing record", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue({
      id: "pb-3",
      name: "Deadlift",
      unit: "KG",
      direction: "HIGHER",
      bestValue: 100,
      verified: false,
    });

    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        name: "Deadlift",
        value: 220,
        unit: "LB",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain("KG");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid scoring direction", async () => {
    const { POST } = await import("@/app/api/personal-bests/route");
    const response = await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        direction: "FASTER",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("falls back to a unit-based default when no scoring is given", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue(null);
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/personal-bests/route");
    await POST(
      jsonRequest("http://localhost/api/personal-bests", {
        ...validBody,
        name: "Mystery Run",
        unit: "MINUTES",
        value: 25,
      }),
    );

    const createArgs = tx.personalBest.create.mock.calls[0][0];
    expect(createArgs.data.direction).toBe("LOWER");
  });
});

describe("GET /api/personal-bests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
  });

  it("returns the current user's records with PR counts", async () => {
    asMock(prisma.personalBest.findMany).mockResolvedValue([
      { id: "pb-1", name: "Max Push-ups" },
    ]);

    const { GET } = await import("@/app/api/personal-bests/route");
    const response = await GET(new Request("http://localhost/api/personal-bests"));
    const body = await response.json();

    expect(body).toHaveLength(1);
    expect(prisma.personalBest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1" }),
        include: expect.objectContaining({
          _count: { select: { attempts: true, achievements: true } },
        }),
      }),
    );
  });

  it("filters by category and search term", async () => {
    asMock(prisma.personalBest.findMany).mockResolvedValue([]);

    const { GET } = await import("@/app/api/personal-bests/route");
    await GET(
      new Request("http://localhost/api/personal-bests?type=BODY_METRIC&q=weight"),
    );

    const args = asMock(prisma.personalBest.findMany).mock.calls[0][0];
    expect(args.where).toMatchObject({
      userId: "user-1",
      type: "BODY_METRIC",
      name: { contains: "weight", mode: "insensitive" },
    });
  });

  it("ignores an unknown category", async () => {
    asMock(prisma.personalBest.findMany).mockResolvedValue([]);

    const { GET } = await import("@/app/api/personal-bests/route");
    await GET(new Request("http://localhost/api/personal-bests?type=HACK"));

    const args = asMock(prisma.personalBest.findMany).mock.calls[0][0];
    expect(args.where).not.toHaveProperty("type");
  });
});
