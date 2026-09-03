import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createFileStateStore, createPartitionedFileStateStore, normalizeAppState } from './stateStore.js';

test('file store starts empty and restores a saved app state', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fin-state-'));
  const store = createFileStateStore({
    filePath: join(directory, 'app-state.json'),
    now: () => '2026-08-24T10:00:00.000Z'
  });

  try {
    assert.equal(await store.load(), null);
    const saved = await store.save({
      monthlyBudget: 0,
      settings: { name: '小圓' },
      transactions: [{ id: 'tx_1', amount: 110 }],
      goals: [],
      recurring: [],
      barcode: '',
      theme: 'dark',
      onboardingCompleted: true,
      assistant: { pendingConfirmation: { mode: 'missing_amount', item: { title: '飲料' } } }
    });

    assert.equal(saved.monthlyBudget, 0);
    assert.equal(saved.updatedAt, '2026-08-24T10:00:00.000Z');
    assert.equal(saved.schemaVersion, 2);
    assert.equal(saved.assistant.pendingConfirmation.mode, 'missing_amount');
    assert.deepEqual(await store.load(), saved);
    await store.clear();
    assert.equal(await store.load(), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('normalization rejects invalid roots and safely repairs fields', () => {
  assert.throws(() => normalizeAppState(null), /state/);
  const state = normalizeAppState({ monthlyBudget: -100, transactions: 'bad', theme: 'blue' });
  assert.equal(state.monthlyBudget, 0);
  assert.deepEqual(state.transactions, []);
  assert.equal(state.theme, 'system');
});

test('file store serializes overlapping saves and leaves the newest complete snapshot', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fin-state-queue-'));
  const store = createFileStateStore({ filePath: join(directory, 'app-state.json') });

  try {
    const saves = Array.from({ length: 12 }, (_, monthlyBudget) => store.save({
      monthlyBudget,
      transactions: [{ id: `tx_${monthlyBudget}`, amount: monthlyBudget }]
    }));
    await Promise.all(saves);

    const latest = await store.load();
    assert.equal(latest.monthlyBudget, 11);
    assert.equal(latest.transactions[0].id, 'tx_11');
    assert.deepEqual((await readdir(directory)).filter((name) => name.endsWith('.tmp')), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('partitioned store isolates devices and lets one upgraded device claim legacy data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'fin-partitioned-'));
  const usersDirectory = join(directory, 'users');
  const legacyFilePath = join(directory, 'app-state.json');
  const legacyStore = createFileStateStore({ filePath: legacyFilePath });
  await legacyStore.save({ monthlyBudget: 8800, settings: { name: '小圓' } });
  const store = createPartitionedFileStateStore({ directoryPath: usersDirectory, legacyFilePath });

  try {
    assert.equal(await store.load('device-new-001'), null);
    const claimed = await store.load('device-existing-001', { claimLegacy: true });
    assert.equal(claimed.monthlyBudget, 8800);
    assert.equal((await store.load('device-existing-001')).settings.name, '小圓');
    assert.equal(await store.load('device-new-001'), null);

    await store.save('device-new-001', { monthlyBudget: 3000 });
    assert.equal((await store.load('device-new-001')).monthlyBudget, 3000);
    assert.equal((await store.load('device-existing-001')).monthlyBudget, 8800);

    await store.clear('device-new-001');
    assert.equal(await store.load('device-new-001'), null);
    assert.equal((await store.load('device-existing-001')).monthlyBudget, 8800);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
