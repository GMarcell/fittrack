import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateQuestsForUser } from "@/lib/quest";
import { QuestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    stat: {
      findMany: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    goal: {
      findMany: vi.fn(),
    },
    quest: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock Groq SDK using a function constructor (arrow functions can't be used with `new`)
vi.mock("groq-sdk", () => {
  const mockCreate = vi.fn();
  function MockGroq() {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  }
  return { default: MockGroq };
});

describe("generateQuestsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if GROQ_API_KEY is not set", async () => {
    const origKey = process.env.GROQ_API_KEY;
    // @ts-expect-error - deleting env var for test
    delete process.env.GROQ_API_KEY;

    await expect(generateQuestsForUser("user-1")).rejects.toThrow(
      "GROQ_API_KEY not configured",
    );

    process.env.GROQ_API_KEY = origKey;
  });

  it("generates quests from AI response and saves them", async () => {
    const mockStats = [
      { type: "STR", value: 20 },
      { type: "END", value: 45 },
      { type: "AGI", value: 30 },
    ];
    const mockSessions: Array<Record<string, unknown>> = [];
    const mockGoals: Array<Record<string, unknown>> = [];

    (prisma.stat.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockStats);
    (prisma.session.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockSessions);
    (prisma.goal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockGoals);
    (prisma.quest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const mockQuestData = [
      {
        title: "Do 50 push-ups",
        description: "Build upper body strength",
        targetText: "50 push-ups in one set",
        rewards: [{ type: "STR", completionValue: 3, failurePenalty: 1 }],
      },
      {
        title: "Run 3km",
        description: "Boost your endurance",
        targetText: "3km run",
        rewards: [{ type: "END", completionValue: 3, failurePenalty: 1 }],
      },
    ];

    // Mock Groq - get the mock instance
    const GroqMock = (await import("groq-sdk")).default as unknown as new () => {
      chat: { completions: { create: ReturnType<typeof vi.fn> } };
    };
    const groqInstance = new GroqMock();

    (groqInstance.chat.completions.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockQuestData),
          },
        },
      ],
    });

    // Mock quest creation
    (prisma.quest.create as ReturnType<typeof vi.fn>).mockImplementation(
      (args: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: "mock-quest-id",
          ...args.data,
          status: QuestStatus.OFFERED,
          rewards: (args.data.rewards as { create: Array<Record<string, unknown>> })?.create || [],
          userId: "user-1",
          createdAt: new Date(),
          date: new Date(),
        }),
    );

    const quests = await generateQuestsForUser("user-1");

    expect(quests).toHaveLength(2);
    expect(prisma.quest.deleteMany).toHaveBeenCalled();
    expect(prisma.quest.create).toHaveBeenCalledTimes(2);

    // Verify the Groq was called with a prompt containing stats
    expect(groqInstance.chat.completions.create).toHaveBeenCalledTimes(1);
    const promptCall = (groqInstance.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(promptCall.messages[0].content).toContain("STR");
    expect(promptCall.messages[0].content).toContain("20/100");
  });

  it("handles empty AI response gracefully", async () => {
    (prisma.stat.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.session.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.goal.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.quest.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const GroqMock = (await import("groq-sdk")).default as unknown as new () => {
      chat: { completions: { create: ReturnType<typeof vi.fn> } };
    };
    const groqInstance = new GroqMock();

    (groqInstance.chat.completions.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      choices: [{ message: { content: "[]" } }],
    });

    const quests = await generateQuestsForUser("user-1");
    expect(quests).toEqual([]);
    expect(prisma.quest.create).not.toHaveBeenCalled();
  });
});
