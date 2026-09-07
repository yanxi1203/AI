import test from 'node:test';
import assert from 'node:assert/strict';
import { StateConflictError, createSupabaseStateStore } from './supabaseStateStore.js';

const USER_A = '11111111-1111-4111-8111-111111111111';

function createFakeSupabase() {
  const rows = new Map();
  const tokens = [];
  return {
    rows,
    tokens,
    clientFactory(context) {
      tokens.push(context.accessToken);
      return {
        from(table) {
          assert.equal(table, 'app_states_v2');
          return {
            select(columns) {
              assert.equal(columns, 'state, revision');
              return {
                eq(column, userId) {
                  assert.equal(column, 'user_id');
                  return {
                    async maybeSingle() {
                      const row = rows.get(userId);
                      return { data: row ? { state: row.state, revision: row.revision } : null, error: null };
                    }
                  };
                }
              };
            },
            insert(row) {
              return {
                select(columns) {
                  assert.equal(columns, 'state, revision');
                  return {
                    async single() {
                      if (rows.has(row.user_id)) return { data: null, error: { code: '23505', message: 'duplicate' } };
                      rows.set(row.user_id, row);
                      return { data: row, error: null };
                    }
                  };
                }
              };
            },
            update(row) {
              const filters = {};
              const chain = {
                eq(column, value) {
                  filters[column] = value;
                  return chain;
                },
                select(columns) {
                  assert.equal(columns, 'state, revision');
                  return {
                    async maybeSingle() {
                      const current = rows.get(filters.user_id);
                      if (!current || current.revision !== filters.revision) return { data: null, error: null };
                      rows.set(filters.user_id, row);
                      return { data: row, error: null };
                    }
                  };
                }
              };
              return chain;
            },
            delete() {
              return {
                async eq(column, userId) {
                  assert.equal(column, 'user_id');
                  rows.delete(userId);
                  return { error: null };
                }
              };
            }
          };
        }
      };
    }
  };
}

const context = { userId: USER_A, accessToken: 'jwt-a' };

test('Supabase store uses user JWT and revision compare-and-swap', async () => {
  const fake = createFakeSupabase();
  const store = createSupabaseStateStore({
    clientFactory: fake.clientFactory,
    now: () => '2026-09-07T00:00:00.000Z'
  });

  assert.deepEqual(await store.load(context), { state: null, revision: 0 });
  const first = await store.save(context, { monthlyBudget: 4200 }, { expectedRevision: 0 });
  assert.equal(first.revision, 1);
  assert.equal(first.state.monthlyBudget, 4200);
  const second = await store.save(context, { monthlyBudget: 5000 }, { expectedRevision: 1 });
  assert.equal(second.revision, 2);
  assert.equal((await store.load(context)).state.monthlyBudget, 5000);
  assert.ok(fake.tokens.every((token) => token === 'jwt-a'));
  assert.equal(fake.rows.get(USER_A).user_id, USER_A);

  await assert.rejects(
    () => store.save(context, { monthlyBudget: 9999 }, { expectedRevision: 1 }),
    StateConflictError
  );
  assert.equal((await store.load(context)).state.monthlyBudget, 5000);

  await store.clear(context);
  assert.deepEqual(await store.load(context), { state: null, revision: 0 });
});

test('Supabase store refuses missing token, invalid owner and duplicate create', async () => {
  const fake = createFakeSupabase();
  const store = createSupabaseStateStore({ clientFactory: fake.clientFactory });
  await assert.rejects(() => store.load({ userId: USER_A }), /access token/);
  await assert.rejects(() => store.load({ userId: 'device-id', accessToken: 'jwt' }), /使用者識別/);
  await store.save(context, {}, { expectedRevision: 0 });
  await assert.rejects(() => store.save(context, {}, { expectedRevision: 0 }), StateConflictError);
});
