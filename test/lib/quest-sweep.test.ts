import { describe, it, expect, vi, beforeEach } from "vitest";
import { runQuestFailureSweep } from "@/lib/quest-sweep";
import { prisma } from "@/lib/prisma";
import { QuestStatus } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quest: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
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

describe("runQuestFailureSweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { resolved: 0 } when no expired quests", async () => {
    (prisma.quest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await runQuestFailureSweep("user-1");

    expect(result).toEqual({ resolved: 0 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("resolves expired quests with failure penalties", async () => {
    const expiredQuests = [
      {
        id: "q-1",
        userId: "user-1",
        title: "Do 50 push-ups",
        status: QuestStatus.PENDING,
        rewards: [
          { type: "STR", completionValue: 3, failurePenalty: 1 },
          { type: "END", completionValue: 2, failurePenalty: 1 },
        ],
      },
    ];

    (prisma.quest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(expiredQuests);
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await runQuestFailureSweep("user-1");

    expect(result).toEqual({ resolved: 1 });

    // Verify transaction was called with updateMany + stat updates + statHistory creates
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);

    const transactionArg = (prisma.$transaction as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(transactionArg).toHaveLength(5); // 1 updateMany + 2 stat updates + 2 statHistory creates
  });

  it("filters by userId when provided", async () => {
    (prisma.quest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await runQuestFailureSweep("user-1");

    expect(prisma.quest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
        }),
      }),
    );
  });

  it("does not filter by userId when not provided (sweep all)", async () => {
    (prisma.quest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await runQuestFailureSweep();

    const whereArg = (prisma.quest.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0][0].where;
    expect(whereArg).not.toHaveProperty("userId");
  });

  it("only targets PENDING quests before today", async () => {
    (prisma.quest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await runQuestFailureSweep("user-1");

    const whereArg = (prisma.quest.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0][0].where;
    expect(whereArg.status).toBe(QuestStatus.PENDING);
    expect(whereArg.date).toHaveProperty("lt");
  });
});
