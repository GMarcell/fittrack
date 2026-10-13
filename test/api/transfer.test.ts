import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personalBest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    attempt: { create: vi.fn(), updateMany: vi.fn() },
    achievement: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: vi.fn(),
}));

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function importRequest(csv: string) {
  return new Request("http://localhost/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csv }),
  });
}

function mockTransaction() {
  const tx = {
    personalBest: {
      create: vi.fn().mockImplementation(async ({ data }: { data: { name: string } }) => ({
        id: `pb-${data.name}`,
      })),
      update: vi.fn().mockResolvedValue({}),
    },
    attempt: {
      create: vi.fn().mockResolvedValue({ id: "a-new" }),
      updateMany: vi.fn(),
    },
    achievement: { create: vi.fn().mockResolvedValue({ id: "ach" }) },
  };

  asMock(prisma.$transaction).mockImplementation(
    async (fn: (client: typeof tx) => unknown) => fn(tx),
  );

  return tx;
}

describe("GET /api/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
  });

  it("returns 401 when unauthenticated", async () => {
    asMock(auth.getCurrentUser).mockResolvedValue(null);

    const { GET } = await import("@/app/api/export/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns one CSV row per entry with a download header", async () => {
    asMock(prisma.personalBest.findMany).mockResolvedValue([
      {
        name: "Bench Press",
        type: "EXERCISE",
        unit: "KG",
        direction: "HIGHER",
        attempts: [
          {
            value: 100,
            reps: 5,
            date: new Date("2026-04-01"),
            notes: null,
            isBest: true,
          },
          {
            value: 95,
            reps: null,
            date: new Date("2026-03-01"),
            notes: "easier",
            isBest: false,
          },
        ],
      },
    ]);

    const { GET } = await import("@/app/api/export/route");
    const response = await GET();
    const text = await response.text();
    const lines = text.trim().split("\n");

    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("attachment");

    expect(lines[0]).toBe(
      "name,type,unit,direction,value,reps,date,notes,isBest",
    );
    expect(lines[1]).toBe(
      "Bench Press,EXERCISE,KG,HIGHER,100,5,2026-04-01,,true",
    );
    expect(lines[2]).toBe(
      "Bench Press,EXERCISE,KG,HIGHER,95,,2026-03-01,easier,false",
    );
  });

  it("scopes the export to the current user", async () => {
    asMock(prisma.personalBest.findMany).mockResolvedValue([]);

    const { GET } = await import("@/app/api/export/route");
    await GET();

    expect(prisma.personalBest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
      }),
    );
  });
});

describe("POST /api/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
    asMock(prisma.personalBest.findUnique).mockResolvedValue(null);
    mockTransaction();
  });

  it("returns 401 when unauthenticated", async () => {
    asMock(auth.getCurrentUser).mockResolvedValue(null);

    const { POST } = await import("@/app/api/import/route");
    const response = await POST(importRequest("name,value,date\nX,1,2026-01-01"));

    expect(response.status).toBe(401);
  });

  it("rejects an empty body", async () => {
    const { POST } = await import("@/app/api/import/route");
    const response = await POST(importRequest(""));

    expect(response.status).toBe(400);
  });

  it("rejects a file with no rows", async () => {
    const { POST } = await import("@/app/api/import/route");
    const response = await POST(importRequest("name,value,date\n"));

    expect(response.status).toBe(400);
  });

  it("imports rows and rebuilds the achievements they produced", async () => {
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/import/route");
    const response = await POST(
      importRequest(
        [
          "name,type,unit,direction,value,date",
          "Max Push-ups,EXERCISE,REPS,HIGHER,30,2026-01-01",
          "Max Push-ups,EXERCISE,REPS,HIGHER,45,2026-02-01",
          "Max Push-ups,EXERCISE,REPS,HIGHER,40,2026-03-01",
        ].join("\n"),
      ),
    );
    const body = await response.json();

    expect(body.summary.recordsCreated).toBe(1);
    expect(body.summary.entriesImported).toBe(3);
    // 30 establishes the record, 45 breaks it; 40 does not.
    expect(body.summary.achievements).toBe(2);
    expect(tx.achievement.create).toHaveBeenCalledTimes(2);
    expect(tx.personalBest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Max Push-ups",
          unit: "REPS",
          direction: "HIGHER",
          bestValue: 30,
        }),
      }),
    );
  });

  it("replays entries in date order regardless of file order", async () => {
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/import/route");
    await POST(
      importRequest(
        [
          "name,unit,value,date",
          "Deadlift,KG,120,2026-03-01",
          "Deadlift,KG,100,2026-01-01",
        ].join("\n"),
      ),
    );

    const created = tx.attempt.create.mock.calls.map(
      (call) => (call[0] as { data: { value: number } }).data.value,
    );
    expect(created).toEqual([100, 120]);
  });

  it("appends to an existing record instead of duplicating it", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue({
      id: "pb-existing",
      unit: "REPS",
      direction: "HIGHER",
      bestValue: 45,
    });
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/import/route");
    const response = await POST(
      importRequest("name,unit,value,date\nMax Push-ups,REPS,50,2026-04-01"),
    );
    const body = await response.json();

    expect(body.summary.recordsCreated).toBe(0);
    expect(body.summary.recordsUpdated).toBe(1);
    expect(tx.personalBest.create).not.toHaveBeenCalled();
    expect(tx.achievement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 50, previousValue: 45 }),
      }),
    );
  });

  it("skips rows whose unit conflicts with the existing record", async () => {
    asMock(prisma.personalBest.findUnique).mockResolvedValue({
      id: "pb-existing",
      unit: "KG",
      direction: "HIGHER",
      bestValue: 100,
    });

    const { POST } = await import("@/app/api/import/route");
    const response = await POST(
      importRequest("name,unit,value,date\nDeadlift,LB,220,2026-04-01"),
    );
    const body = await response.json();

    expect(body.summary.entriesImported).toBe(0);
    expect(body.summary.recordsCreated).toBe(0);
    expect(body.summary.skipped).toBe(1);
    // The message names the unit the record is actually tracked in.
    expect(body.errors[0]).toContain("already tracked in KG");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("reports unparseable rows without importing them", async () => {
    const { POST } = await import("@/app/api/import/route");
    const response = await POST(
      importRequest(
        [
          "name,value,date",
          ",45,2026-01-01",
          "Push-ups,heavy,2026-01-01",
          "Push-ups,45,not-a-date",
          "Push-ups,45,2026-01-02",
        ].join("\n"),
      ),
    );
    const body = await response.json();

    expect(body.summary.entriesImported).toBe(1);
    expect(body.summary.skipped).toBe(3);
    expect(body.errors).toHaveLength(3);
    expect(body.errors[0]).toContain("Line 2");
  });

  it("defaults the unit and scoring from a known preset", async () => {
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/import/route");
    await POST(importRequest("name,value,date\nPlank Hold,120,2026-01-01"));

    expect(tx.personalBest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unit: "SECONDS",
          // A plank hold is higher-is-better even though it is measured in seconds.
          direction: "HIGHER",
        }),
      }),
    );
  });

  it("keeps an explicit direction from the file", async () => {
    const tx = mockTransaction();

    const { POST } = await import("@/app/api/import/route");
    await POST(
      importRequest("name,unit,direction,value,date\nMystery Hold,SECONDS,HIGHER,90,2026-01-01"),
    );

    expect(tx.personalBest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ direction: "HIGHER" }),
      }),
    );
  });
});
