import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatestSnapshotSaver } from './latestSnapshotSaver.js';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
};

test('snapshot saver serializes requests and coalesces queued state to the newest snapshot', async () => {
  const firstSave = deferred();
  const persisted = [];
  const saveLatest = createLatestSnapshotSaver(async (snapshot) => {
    persisted.push(snapshot.version);
    if (snapshot.version === 1) await firstSave.promise;
    return snapshot;
  });

  const first = saveLatest({ version: 1 });
  const second = saveLatest({ version: 2 });
  const third = saveLatest({ version: 3 });

  await Promise.resolve();
  assert.deepEqual(persisted, [1]);
  firstSave.resolve();

  assert.deepEqual(await first, { version: 1 });
  assert.deepEqual(await second, { version: 3 });
  assert.deepEqual(await third, { version: 3 });
  assert.deepEqual(persisted, [1, 3]);
});

test('snapshot saver continues with a newer snapshot after one save fails', async () => {
  const firstSave = deferred();
  const persisted = [];
  const saveLatest = createLatestSnapshotSaver(async (snapshot) => {
    persisted.push(snapshot.version);
    if (snapshot.version === 1) await firstSave.promise;
    return snapshot;
  });

  const first = saveLatest({ version: 1 });
  const second = saveLatest({ version: 2 });
  firstSave.reject(new Error('offline'));

  await assert.rejects(first, /offline/);
  assert.deepEqual(await second, { version: 2 });
  assert.deepEqual(persisted, [1, 2]);
});

test('snapshot saver rejects an invalid persistence dependency', () => {
  assert.throws(() => createLatestSnapshotSaver(null), /saveSnapshot/);
});
