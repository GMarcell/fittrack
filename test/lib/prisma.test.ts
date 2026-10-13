import { describe, it, expect } from "vitest";

describe("prisma singleton", () => {
  it("exports a PrismaClient instance", async () => {
    const { prisma } = await import("@/lib/prisma");
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe("function");
    expect(typeof prisma.$disconnect).toBe("function");
  });

  it("exposes the personal best models", async () => {
    const { prisma } = await import("@/lib/prisma");
    expect(typeof prisma.user.findUnique).toBe("function");
    expect(typeof prisma.personalBest.findMany).toBe("function");
    expect(typeof prisma.personalBest.create).toBe("function");
    expect(typeof prisma.attempt.create).toBe("function");
    expect(typeof prisma.attempt.findMany).toBe("function");
    expect(typeof prisma.$transaction).toBe("function");
  });

  it("returns the same instance on repeated imports", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { prisma: prisma2 } = await import("@/lib/prisma");
    expect(prisma).toBe(prisma2);
  });
});
