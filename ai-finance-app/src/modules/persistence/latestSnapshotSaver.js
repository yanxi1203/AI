/**
 * Creates one ordered persistence interface for UI snapshots.
 *
 * While a save is in flight, newer snapshots are coalesced so callers never
 * let an older request overtake the latest state.
 */
export function createLatestSnapshotSaver(saveSnapshot) {
  if (typeof saveSnapshot !== 'function') throw new TypeError('saveSnapshot 必須是函式');

  let saving = false;
  let queuedSnapshot = null;
  let queuedWaiters = [];
  let cancelled = false;

  const drain = async () => {
    saving = true;
    while (queuedSnapshot && !cancelled) {
      const snapshot = queuedSnapshot;
      const waiters = queuedWaiters;
      queuedSnapshot = null;
      queuedWaiters = [];

      try {
        const saved = await saveSnapshot(snapshot);
        waiters.forEach(({ resolve }) => resolve(saved));
      } catch (error) {
        waiters.forEach(({ reject }) => reject(error));
      }
    }
    saving = false;
  };

  const saveLatest = (snapshot) => new Promise((resolve, reject) => {
    if (cancelled) cancelled = false;
    queuedSnapshot = snapshot;
    queuedWaiters.push({ resolve, reject });
    if (!saving) void drain();
  });

  saveLatest.cancel = (reason = new Error('快照儲存已取消')) => {
    cancelled = true;
    const error = reason instanceof Error ? reason : new Error(String(reason));
    const waiters = queuedWaiters;
    queuedSnapshot = null;
    queuedWaiters = [];
    waiters.forEach(({ reject }) => reject(error));
  };

  return saveLatest;
}
