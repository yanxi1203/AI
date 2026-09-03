import test from 'node:test';
import assert from 'node:assert/strict';
import { createMigratingStateStore, createSupabaseStateStore } from './supabaseStateStore.js';

const createFakeSupabase = () => {
  const rows = new Map();

  return {
    rows,
    client: {
      from(table) {
        assert.equal(table, 'app_states');
        return {
          select(columns) {
            assert.equal(columns, 'state');
            return {
              eq(column, deviceId) {
                assert.equal(column, 'device_id');
                return {
                  async maybeSingle() {
                    const row = rows.get(deviceId);
                    return { data: row ? { state: row.state } : null, error: null };
                  }
                };
              }
            };
          },
          upsert(row, options) {
            assert.equal(options.onConflict, 'device_id');
            rows.set(row.device_id, row);
            return {
              select(columns) {
                assert.equal(columns, 'state');
                return {
                  async single() {
                    return { data: { state: row.state }, error: null };
                  }
                };
              }
            };
          },
          delete() {
            return {
              async eq(column, deviceId) {
                assert.equal(column, 'device_id');
                rows.delete(deviceId);
                return { error: null };
              }
            };
          }
        };
      }
    }
  };
};

test('Supabase store loads, saves and clears one normalized device snapshot', async () => {
  const fake = createFakeSupabase();
  const store = createSupabaseStateStore({
    client: fake.client,
    now: () => '2026-08-27T09:00:00.000Z'
  });

  assert.equal(await store.load('device-test-001'), null);
  const saved = await store.save('device-test-001', {
    monthlyBudget: 4200,
    settings: { name: '小圓' },
    transactions: [{ id: 'tx_1', amount: 110 }]
  });

  assert.equal(saved.schemaVersion, 2);
  assert.equal(saved.updatedAt, '2026-08-27T09:00:00.000Z');
  assert.equal((await store.load('device-test-001')).settings.name, '小圓');
  assert.equal(fake.rows.get('device-test-001').schema_version, 2);

  await store.clear('device-test-001');
  assert.equal(await store.load('device-test-001'), null);
});

test('migrating store uploads local data once and removes its legacy copy', async () => {
  const cloud = new Map();
  const local = new Map([['device-test-001', { monthlyBudget: 8800 }]]);
  const primaryStore = {
    load: async (id) => cloud.get(id) || null,
    save: async (id, state) => (cloud.set(id, state), state),
    clear: async (id) => { cloud.delete(id); }
  };
  const legacyStore = {
    load: async (id) => local.get(id) || null,
    save: async (id, state) => (local.set(id, state), state),
    clear: async (id) => { local.delete(id); }
  };
  const store = createMigratingStateStore({ primaryStore, legacyStore });

  assert.equal((await store.load('device-test-001')).monthlyBudget, 8800);
  assert.equal(cloud.get('device-test-001').monthlyBudget, 8800);
  assert.equal(local.has('device-test-001'), false);

  await store.clear('device-test-001');
  assert.equal(cloud.has('device-test-001'), false);
  assert.equal(local.has('device-test-001'), false);
});
