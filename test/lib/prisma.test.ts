import { describe, it, expect } from "vitest";

describe("prisma singleton", () => {
  it("exports a PrismaClient instance", async () => {
    const { prisma } = await import("@/lib/prisma");
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe("function");
    expect(typeof prisma.$disconnect).toBe("function");
  });

  it("has expected model methods", async () => {
    const { prisma } = await import("@/lib/prisma");
    expect(typeof prisma.user.findUnique).toBe("function");
    expect(typeof prisma.user.findMany).toBe("function");
    expect(typeof prisma.user.create).toBe("function");
    expect(typeof prisma.session.findMany).toBe("function");
    expect(typeof prisma.session.create).toBe("function");
    expect(typeof prisma.quest.findMany).toBe("function");
    expect(typeof prisma.goal.findMany).toBe("function");
    expect(typeof prisma.stat.upsert).toBe("function");
    expect(typeof prisma.$transaction).toBe("function");
  });

  it("returns the same instance on repeated imports", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { prisma: prisma2 } = await import("@/lib/prisma");
    expect(prisma).toBe(prisma2);
  });
});
