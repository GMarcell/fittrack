import { describe, it, expect } from "vitest";

describe("auth module", () => {
  it("has expected exports", async () => {
    const authModule = await import("@/lib/auth");
    expect(authModule).toHaveProperty("handlers");
    expect(authModule).toHaveProperty("auth");
    expect(authModule).toHaveProperty("signIn");
    expect(authModule).toHaveProperty("signOut");
    expect(authModule).toHaveProperty("getCurrentUser");
  });

  it("getCurrentUser returns null when not authenticated", async () => {
    const { getCurrentUser } = await import("@/lib/auth");
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });
});
