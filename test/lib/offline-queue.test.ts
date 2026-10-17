// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  flushQueuedSets,
  isOfflineQueuedId,
  queueSet,
  readQueuedSets,
  removeQueuedSet,
} from "@/lib/offline-queue";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    values,
  };
}

const input = {
  sessionId: "session-1",
  exerciseId: "exercise-1",
  weight: 80,
  reps: 5,
  rpe: 8,
};

describe("offline set queue", () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("queues a set with an offline id", () => {
    const queued = queueSet(input, storage);

    expect(isOfflineQueuedId(queued.id)).toBe(true);
    expect(readQueuedSets(storage)).toEqual([queued]);
  });

  it("removes a queued set", () => {
    const queued = queueSet(input, storage);

    expect(removeQueuedSet(queued.id, storage)).toEqual([]);
    expect(readQueuedSets(storage)).toEqual([]);
  });

  it("survives corrupted storage", () => {
    storage.setItem("fittrack:queued-sets", "{not json");
    expect(readQueuedSets(storage)).toEqual([]);
  });

  it("replays queued sets and clears them on success", async () => {
    queueSet(input, storage);
    queueSet({ ...input, reps: 6 }, storage);

    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    const result = await flushQueuedSets(fetcher as unknown as typeof fetch, storage);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toBe("/api/sessions/session-1/sets");
    expect(result).toEqual({ synced: 2, remaining: 0 });
    expect(readQueuedSets(storage)).toEqual([]);
  });

  it("keeps the queue when the network fails", async () => {
    queueSet(input, storage);
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await flushQueuedSets(fetcher as unknown as typeof fetch, storage);

    expect(result).toEqual({ synced: 0, remaining: 1 });
    expect(readQueuedSets(storage)).toHaveLength(1);
  });

  it("drops a set the server rejects, but keeps the rest", async () => {
    queueSet(input, storage);
    queueSet({ ...input, exerciseId: "exercise-2" }, storage);

    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 400 })
      .mockResolvedValueOnce({ ok: true, status: 201 });

    const result = await flushQueuedSets(fetcher as unknown as typeof fetch, storage);

    expect(result).toEqual({ synced: 1, remaining: 0 });
  });

  it("keeps unauthorized requests for a later session", async () => {
    queueSet(input, storage);
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    const result = await flushQueuedSets(fetcher as unknown as typeof fetch, storage);

    expect(result.remaining).toBe(1);
  });
});
