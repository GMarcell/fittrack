import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personalBest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    attempt: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    achievement: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Transaction mock whose inner calls are exposed for assertions. */
function mockTransaction() {
  const tx = {
    personalBest: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({ id: "pb-1" }),
    },
    attempt: {
      create: vi.fn().mockResolvedValue({ id: "a-new" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn(),
    },
    achievement: { create: vi.fn().mockResolvedValue({ id: "ach-1" }) },
  };

  asMock(prisma.$transaction).mockImplementation(
    async (fn: (client: typeof tx) => unknown) => fn(tx),
  );

  return tx;
}

describe("GET /api/personal-bests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
  });

  it("returns 404 for another user's record", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue(null);

    const { GET } = await import("@/app/api/personal-bests/[id]/route");
    const response = await GET(new Request("http://localhost/api/x"), ctx("pb-9"));

    expect(response.status).toBe(404);
  });

  it("scopes the lookup to the current user", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue({ id: "pb-1" });

    const { GET } = await import("@/app/api/personal-bests/[id]/route");
    const response = await GET(new Request("http://localhost/api/x"), ctx("pb-1"));

    expect(response.status).toBe(200);
    expect(prisma.personalBest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "pb-1", userId: "user-1" } }),
    );
  });
});

describe("PATCH /api/personal-bests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
  });

  it("returns 400 for an invalid patch", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue({
      id: "pb-1",
      unit: "KG",
    });

    const { PATCH } = await import("@/app/api/personal-bests/[id]/route");
    const response = await PATCH(jsonRequest({ unit: "STONES" }, "PATCH"), ctx("pb-1"));

    expect(response.status).toBe(400);
  });

  it("updates notes without recomputing the best", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue({
      id: "pb-1",
      unit: "KG",
      direction: "HIGHER",
    });
    const tx = mockTransaction();

    const { PATCH } = await import("@/app/api/personal-bests/[id]/route");
    const response = await PATCH(
      jsonRequest({ notes: "Felt strong" }, "PATCH"),
      ctx("pb-1"),
    );

    expect(response.status).toBe(200);
    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { notes: "Felt strong" } }),
    );
    expect(tx.attempt.updateMany).not.toHaveBeenCalled();
  });

  it("recomputes the best when the unit changes", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue({
      id: "pb-1",
      unit: "KG",
      direction: "HIGHER",
    });
    const tx = mockTransaction();
    tx.personalBest.findUnique.mockResolvedValue({
      id: "pb-1",
      type: "EXERCISE",
      unit: "LB",
      direction: "HIGHER",
      attempts: [
        { id: "a-1", value: 200, date: new Date("2026-01-01"), isBest: false },
        { id: "a-2", value: 240, date: new Date("2026-02-01"), isBest: false },
      ],
    });

    const { PATCH } = await import("@/app/api/personal-bests/[id]/route");
    const response = await PATCH(jsonRequest({ unit: "LB" }, "PATCH"), ctx("pb-1"));

    expect(response.status).toBe(200);
    expect(tx.attempt.updateMany).toHaveBeenCalled();
    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bestValue: 240 }) }),
    );
  });

  it("recomputes the best when the scoring direction is flipped", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue({
      id: "pb-hold",
      unit: "SECONDS",
      direction: "LOWER",
    });
    const tx = mockTransaction();
    tx.personalBest.findUnique.mockResolvedValue({
      id: "pb-hold",
      type: "EXERCISE",
      unit: "SECONDS",
      direction: "HIGHER",
      attempts: [
        { id: "a-1", value: 95, date: new Date("2026-01-01"), isBest: true },
        { id: "a-2", value: 142, date: new Date("2026-03-01"), isBest: false },
      ],
    });

    const { PATCH } = await import("@/app/api/personal-bests/[id]/route");
    const response = await PATCH(
      jsonRequest({ direction: "HIGHER" }, "PATCH"),
      ctx("pb-hold"),
    );

    expect(response.status).toBe(200);
    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bestValue: 142 }) }),
    );
  });
});

describe("DELETE /api/personal-bests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
  });

  it("returns 404 when the record is not the user's", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/personal-bests/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/x"), ctx("pb-9"));

    expect(response.status).toBe(404);
    expect(prisma.personalBest.delete).not.toHaveBeenCalled();
  });

  it("deletes the record", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue({ id: "pb-1" });
    asMock(prisma.personalBest.delete).mockResolvedValue({ id: "pb-1" });

    const { DELETE } = await import("@/app/api/personal-bests/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/x"), ctx("pb-1"));
    const body = await response.json();

    expect(body).toEqual({ success: true });
    expect(prisma.personalBest.delete).toHaveBeenCalledWith({
      where: { id: "pb-1" },
    });
  });
});

describe("POST /api/personal-bests/[id]/attempts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
  });

  it("returns 404 for an unknown record", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue(null);

    const { POST } = await import("@/app/api/personal-bests/[id]/attempts/route");
    const response = await POST(jsonRequest({ value: 10, date: "2026-04-01" }), ctx("pb-9"));

    expect(response.status).toBe(404);
  });

  it("promotes the record when the entry beats the current best", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue({
      id: "pb-1",
      type: "EXERCISE",
      unit: "REPS",
      direction: "HIGHER",
      bestValue: 40,
    });
    const tx = mockTransaction();
    tx.personalBest.update.mockResolvedValue({ id: "pb-1", bestValue: 44 });
    tx.personalBest.findUnique.mockResolvedValue({
      id: "pb-1",
      type: "EXERCISE",
      unit: "REPS",
      direction: "HIGHER",
      attempts: [{ id: "a-new", value: 44, date: new Date("2026-04-01") }],
    });

    const { POST } = await import("@/app/api/personal-bests/[id]/attempts/route");
    const response = await POST(
      jsonRequest({ value: 44, date: "2026-04-01" }),
      ctx("pb-1"),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.isPersonalBest).toBe(true);
    expect(tx.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          personalBestId: "pb-1",
          value: 44,
          isBest: true,
        }),
      }),
    );
    expect(tx.achievement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 44, previousValue: 40 }),
      }),
    );
  });

  it("does not promote the record for a weaker entry", async () => {
    asMock(prisma.personalBest.findFirst).mockResolvedValue({
      id: "pb-1",
      type: "EXERCISE",
      unit: "REPS",
      direction: "HIGHER",
      bestValue: 40,
    });
    const tx = mockTransaction();
    tx.personalBest.findUnique.mockResolvedValue({
      id: "pb-1",
      direction: "HIGHER",
      bestValue: 40,
    });

    const { POST } = await import("@/app/api/personal-bests/[id]/attempts/route");
    const response = await POST(
      jsonRequest({ value: 32, date: "2026-04-01" }),
      ctx("pb-1"),
    );
    const body = await response.json();

    expect(body.isPersonalBest).toBe(false);
    expect(tx.personalBest.update).not.toHaveBeenCalled();
    expect(tx.achievement.create).not.toHaveBeenCalled();
    expect(tx.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 32, isBest: false }),
      }),
    );
  });
});

describe("DELETE /api/attempts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
  });

  it("returns 404 when the entry is not the user's", async () => {
    asMock(prisma.attempt.findFirst).mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/attempts/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/x"), ctx("a-9"));

    expect(response.status).toBe(404);
  });

  it("deletes the entry and rebuilds the record's best", async () => {
    asMock(prisma.attempt.findFirst).mockResolvedValue({
      id: "a-1",
      personalBestId: "pb-1",
      userId: "user-1",
    });
    const tx = mockTransaction();
    tx.personalBest.findUnique.mockResolvedValue({
      id: "pb-1",
      type: "EXERCISE",
      unit: "REPS",
      direction: "HIGHER",
      attempts: [{ id: "a-2", value: 41, date: new Date("2026-01-01") }],
    });

    const { DELETE } = await import("@/app/api/attempts/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/x"), ctx("a-1"));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(tx.attempt.delete).toHaveBeenCalledWith({ where: { id: "a-1" } });
    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bestValue: 41 }) }),
    );
  });
});
