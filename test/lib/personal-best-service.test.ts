import { describe, it, expect, vi } from "vitest";
import {
  beatsCurrentBest,
  deriveEstimatedOneRep,
  logEntry,
  recomputeBest,
} from "@/lib/personal-best-service";

function createTx(record: unknown) {
  return {
    personalBest: {
      findUnique: vi.fn().mockResolvedValue(record),
      update: vi.fn().mockResolvedValue({ ...(record as object), bestValue: 1 }),
    },
    attempt: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function createEntryTx() {
  return {
    attempt: {
      create: vi.fn().mockResolvedValue({ id: "a-new" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    personalBest: { update: vi.fn().mockResolvedValue({}) },
    achievement: { create: vi.fn().mockResolvedValue({ id: "ach-1" }) },
  };
}

const record = (overrides: Record<string, unknown> = {}) =>
  ({
    id: "pb-1",
    userId: "user-1",
    unit: "REPS" as const,
    direction: "HIGHER" as const,
    bestValue: 40,
    ...overrides,
  }) as never;

describe("beatsCurrentBest", () => {
  it("uses higher-is-better for reps", () => {
    expect(beatsCurrentBest("HIGHER", 41, 40)).toBe(true);
    expect(beatsCurrentBest("HIGHER", 39, 40)).toBe(false);
  });

  it("uses lower-is-better for run times", () => {
    expect(beatsCurrentBest("LOWER", 23, 24)).toBe(true);
    expect(beatsCurrentBest("LOWER", 25, 24)).toBe(false);
  });

  it("lets a longer hold beat a shorter one on the same unit", () => {
    expect(beatsCurrentBest("HIGHER", 150, 120)).toBe(true);
  });

  it("always accepts the newest body metric", () => {
    expect(beatsCurrentBest("LATEST", 76, 80)).toBe(true);
  });
});

describe("deriveEstimatedOneRep", () => {
  it("estimates from a weighted entry with reps", () => {
    expect(deriveEstimatedOneRep("KG", 100, 5)).toBe(116.7);
    expect(deriveEstimatedOneRep("LB", 200, 3)).toBe(220);
  });

  it("returns null without reps", () => {
    expect(deriveEstimatedOneRep("KG", 100, null)).toBeNull();
    expect(deriveEstimatedOneRep("KG", 100, undefined)).toBeNull();
  });

  it("returns null for units that are not weights", () => {
    expect(deriveEstimatedOneRep("REPS", 50, 10)).toBeNull();
    expect(deriveEstimatedOneRep("SECONDS", 120, 5)).toBeNull();
  });
});

describe("logEntry", () => {
  it("establishes a new record and records the first achievement", async () => {
    const tx = createEntryTx();

    const result = await logEntry(
      tx as never,
      record({ bestValue: 45 }),
      { value: 45, date: new Date("2026-04-01"), isFirstEntry: true },
    );

    expect(result.isPersonalBest).toBe(true);
    expect(result.previousValue).toBeNull();
    expect(tx.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isBest: true, value: 45 }),
      }),
    );
    expect(tx.achievement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 45, previousValue: null }),
      }),
    );
  });

  it("establishes a timed record even though its value is not lower than the baseline", async () => {
    const tx = createEntryTx();

    const result = await logEntry(
      tx as never,
      record({ unit: "MINUTES", direction: "LOWER", bestValue: 26 }),
      { value: 26, date: new Date("2026-04-01"), isFirstEntry: true },
    );

    expect(result.isPersonalBest).toBe(true);
    expect(tx.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isBest: true }) }),
    );
  });

  it("records the previous best when a record is broken", async () => {
    const tx = createEntryTx();

    const result = await logEntry(tx as never, record(), {
      value: 47,
      date: new Date("2026-04-02"),
    });

    expect(result.isPersonalBest).toBe(true);
    expect(result.previousValue).toBe(40);
    expect(tx.achievement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ value: 47, previousValue: 40 }),
      }),
    );
    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bestValue: 47 }),
      }),
    );
  });

  it("does not promote or celebrate a weaker entry", async () => {
    const tx = createEntryTx();

    const result = await logEntry(tx as never, record(), {
      value: 32,
      date: new Date("2026-04-02"),
    });

    expect(result.isPersonalBest).toBe(false);
    expect(tx.achievement.create).not.toHaveBeenCalled();
    expect(tx.personalBest.update).not.toHaveBeenCalled();
    expect(tx.attempt.updateMany).not.toHaveBeenCalled();
    expect(tx.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isBest: false }),
      }),
    );
  });

  it("updates a body metric without recording an achievement", async () => {
    const tx = createEntryTx();

    const result = await logEntry(
      tx as never,
      record({ unit: "KG", direction: "LATEST", bestValue: 77 }),
      { value: 76.2, date: new Date("2026-04-02") },
    );

    expect(result.isPersonalBest).toBe(false);
    expect(tx.achievement.create).not.toHaveBeenCalled();
    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bestValue: 76.2 }),
      }),
    );
  });

  it("derives the estimated one-rep max while logging", async () => {
    const tx = createEntryTx();

    await logEntry(tx as never, record({ unit: "KG", bestValue: 100 }), {
      value: 100,
      reps: 5,
      date: new Date("2026-04-02"),
    });

    expect(tx.attempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reps: 5, estimatedOneRep: 116.7 }),
      }),
    );
  });
});

describe("recomputeBest", () => {
  it("returns null when the record does not exist", async () => {
    const tx = createTx(null);
    await expect(recomputeBest(tx as never, "missing")).resolves.toBeNull();
    expect(tx.attempt.updateMany).not.toHaveBeenCalled();
  });

  it("promotes the highest value and flags it as the best attempt", async () => {
    const tx = createTx({
      id: "pb-1",
      type: "EXERCISE",
      unit: "REPS",
      direction: "HIGHER",
      bestValue: 30,
      attempts: [
        { id: "a-1", value: 30, date: new Date("2026-01-01"), isBest: true },
        { id: "a-2", value: 47, date: new Date("2026-02-01"), isBest: false },
      ],
    });

    await recomputeBest(tx as never, "pb-1");

    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pb-1" },
        data: expect.objectContaining({ bestValue: 47 }),
      }),
    );
    expect(tx.attempt.updateMany).toHaveBeenCalledWith({
      where: { personalBestId: "pb-1" },
      data: { isBest: false },
    });
    expect(tx.attempt.updateMany).toHaveBeenCalledWith({
      where: {
        personalBestId: "pb-1",
        value: 47,
        date: new Date("2026-02-01"),
      },
      data: { isBest: true },
    });
  });

  it("rebuilds a timed record around the fastest attempt", async () => {
    const tx = createTx({
      id: "pb-2",
      type: "EXERCISE",
      unit: "MINUTES",
      direction: "LOWER",
      bestValue: 30,
      attempts: [
        { id: "a-1", value: 26.5, date: new Date("2026-01-01"), isBest: false },
        { id: "a-2", value: 24.8, date: new Date("2026-02-01"), isBest: false },
      ],
    });

    await recomputeBest(tx as never, "pb-2");

    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bestValue: 24.8 }) }),
    );
  });

  it("rebuilds a seconds-based hold around the longest attempt", async () => {
    const tx = createTx({
      id: "pb-hold",
      type: "EXERCISE",
      unit: "SECONDS",
      direction: "HIGHER",
      bestValue: 95,
      attempts: [
        { id: "a-1", value: 95, date: new Date("2026-01-01"), isBest: true },
        { id: "a-2", value: 142, date: new Date("2026-03-01"), isBest: false },
      ],
    });

    await recomputeBest(tx as never, "pb-hold");

    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ bestValue: 142 }) }),
    );
  });

  it("keeps the latest measurement for body metrics", async () => {
    const tx = createTx({
      id: "pb-3",
      type: "BODY_METRIC",
      unit: "KG",
      direction: "LATEST",
      bestValue: 80,
      attempts: [
        { id: "a-1", value: 80, date: new Date("2026-01-01"), isBest: true },
        { id: "a-2", value: 76, date: new Date("2026-03-01"), isBest: false },
      ],
    });

    await recomputeBest(tx as never, "pb-3");

    expect(tx.personalBest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bestValue: 76,
          achievedAt: new Date("2026-03-01"),
        }),
      }),
    );
  });

  it("leaves the record alone when there is no history left", async () => {
    const tx = createTx({
      id: "pb-4",
      type: "EXERCISE",
      unit: "REPS",
      direction: "HIGHER",
      bestValue: 30,
      attempts: [],
    });

    await recomputeBest(tx as never, "pb-4");

    expect(tx.personalBest.update).not.toHaveBeenCalled();
  });
});
