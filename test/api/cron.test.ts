import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/quest-sweep", () => ({
  runQuestFailureSweep: vi.fn(),
}));

import { runQuestFailureSweep } from "@/lib/quest-sweep";

describe("GET /api/cron/quest-sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without valid auth header", async () => {
    const { GET } = await import("@/app/api/cron/quest-sweep/route");

    const request = new Request(
      "http://localhost:3000/api/cron/quest-sweep",
    );

    const response = await GET(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
    expect(runQuestFailureSweep).not.toHaveBeenCalled();
  });

  it("runs sweep with valid auth header", async () => {
    (runQuestFailureSweep as ReturnType<typeof vi.fn>).mockResolvedValue({
      resolved: 3,
    });

    const { GET } = await import("@/app/api/cron/quest-sweep/route");

    const request = new Request(
      "http://localhost:3000/api/cron/quest-sweep",
      {
        headers: {
          authorization: "Bearer test-cron-secret",
        },
      },
    );

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.resolved).toBe(3);
    expect(runQuestFailureSweep).toHaveBeenCalledWith();
  });
});
