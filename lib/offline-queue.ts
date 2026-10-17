/**
 * Sets logged without a connection are stored in localStorage under a stable
 * key and replayed against the sessions API on reconnect. Only POSTs of sets
 * are queued — that is the one write you cannot wait to make mid-workout.
 */

export type QueuedSet = {
  id: string;
  sessionId: string;
  exerciseId: string;
  weight: number | null;
  reps: number;
  rpe: number | null;
  queuedAt: number;
};

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const STORAGE_KEY = "fittrack:queued-sets";

const queueListeners = new Set<() => void>();

function notifyQueue(): void {
  for (const listener of queueListeners) listener();
}

/** Subscribe helper for useSyncExternalStore. */
export function subscribeToQueue(listener: () => void): () => void {
  queueListeners.add(listener);
  return () => {
    queueListeners.delete(listener);
  };
}

/** Current queue length; safe as a useSyncExternalStore snapshot. */
export function queuedSetCount(): number {
  return readQueuedSets().length;
}

function getStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function makeId(): string {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readQueuedSets(storage: StorageLike | null = getStorage()): QueuedSet[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is QueuedSet =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as QueuedSet).id === "string" &&
        typeof (item as QueuedSet).sessionId === "string" &&
        typeof (item as QueuedSet).exerciseId === "string" &&
        typeof (item as QueuedSet).reps === "number",
    );
  } catch {
    return [];
  }
}

export function writeQueuedSets(
  queue: QueuedSet[],
  storage: StorageLike | null = getStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(queue));
    notifyQueue();
  } catch {
    // Storage may be full or blocked in private mode; losing the offline queue
    // is better than breaking session logging.
  }
}

export function queueSet(
  input: Omit<QueuedSet, "id" | "queuedAt">,
  storage: StorageLike | null = getStorage(),
): QueuedSet {
  const queued: QueuedSet = { ...input, id: makeId(), queuedAt: Date.now() };
  writeQueuedSets([...readQueuedSets(storage), queued], storage);
  return queued;
}

export function removeQueuedSet(
  id: string,
  storage: StorageLike | null = getStorage(),
): QueuedSet[] {
  const remaining = readQueuedSets(storage).filter((item) => item.id !== id);
  writeQueuedSets(remaining, storage);
  return remaining;
}

export function isOfflineQueuedId(id: string): boolean {
  return id.startsWith("offline-");
}

/**
 * Replays the queue. Network/5xx failures stay queued; a 4xx means the request
 * itself is invalid (session deleted, bad payload), so retrying forever would
 * trap the queue — those are dropped.
 */
export async function flushQueuedSets(
  fetcher: typeof fetch = fetch,
  storage: StorageLike | null = getStorage(),
): Promise<{ synced: number; remaining: number }> {
  let queue = readQueuedSets(storage);
  let synced = 0;

  for (const item of [...queue]) {
    try {
      const res = await fetcher(`/api/sessions/${item.sessionId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId: item.exerciseId,
          weight: item.weight,
          reps: item.reps,
          rpe: item.rpe,
        }),
      });

      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401)) {
        queue = queue.filter((queued) => queued.id !== item.id);
        writeQueuedSets(queue, storage);
        if (res.ok) synced += 1;
      }
    } catch {
      // Offline again or the network dropped; leave this and the rest queued.
      break;
    }
  }

  return { synced, remaining: queue.length };
}
