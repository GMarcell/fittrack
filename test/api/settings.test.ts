import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: vi.fn() } },
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

function request(body: unknown) {
  return new Request("http://localhost/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asMock(auth.getCurrentUser).mockResolvedValue({ id: "user-1" });
    asMock(prisma.user.update).mockImplementation(async ({ data }) => ({
      timezone: data.timezone,
      equipment: data.equipment,
    }));
  });

  it("updates the timezone and normalizes equipment", async () => {
    const { PATCH } = await import("@/app/api/settings/route");

    const response = await PATCH(
      request({ timezone: "Europe/London", equipment: ["bench", "dumbbells", "bench"] }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      timezone: "Europe/London",
      equipment: ["dumbbells", "bench"],
    });
    expect(asMock(prisma.user.update).mock.calls[0][0].data).toMatchObject({
      timezone: "Europe/London",
      equipment: "dumbbells,bench",
    });
  });

  it("rejects an unknown timezone", async () => {
    const { PATCH } = await import("@/app/api/settings/route");

    const response = await PATCH(
      request({ timezone: "Mars/Olympus_Mons", equipment: ["dumbbells"] }),
    );

    expect(response.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("requires at least one equipment option", async () => {
    const { PATCH } = await import("@/app/api/settings/route");

    const response = await PATCH(request({ timezone: "UTC", equipment: [] }));

    expect(response.status).toBe(400);
  });

  it("returns 401 unauthenticated", async () => {
    asMock(auth.getCurrentUser).mockResolvedValue(null);
    const { PATCH } = await import("@/app/api/settings/route");

    expect((await PATCH(request({ timezone: "UTC", equipment: ["dumbbells"] }))).status).toBe(401);
  });
});
