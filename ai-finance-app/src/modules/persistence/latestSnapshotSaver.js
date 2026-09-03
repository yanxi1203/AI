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

  const drain = async () => {
    saving = true;
    while (queuedSnapshot) {
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

  return (snapshot) => new Promise((resolve, reject) => {
    queuedSnapshot = snapshot;
    queuedWaiters.push({ resolve, reject });
    if (!saving) void drain();
  });
}
