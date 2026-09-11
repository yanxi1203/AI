import test from 'node:test';
import assert from 'node:assert/strict';
import { AppStateRequestError, clearAppState, createAppSnapshot, loadAppState, saveAppState } from './appStateClient.js';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' }
});

test('state client authorizes every request and preserves revision metadata', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (options.method === 'PUT') return jsonResponse({ state: JSON.parse(options.body).state, revision: 3 });
    if (options.method === 'DELETE') return jsonResponse({ cleared: true });
    return jsonResponse({ state: { monthlyBudget: 4200 }, revision: 2 });
  };

  assert.deepEqual(await loadAppState({ fetchImpl, accessToken: 'jwt-a' }), {
    state: { monthlyBudget: 4200 },
    revision: 2
  });
  const pendingConfirmation = { mode: 'missing_amount', item: { title: '飲料' } };
  const goals = [{ id: 'goal_trip', title: '日本旅行', targetAmount: 30000, savedAmount: 10000 }];
  const snapshot = createAppSnapshot({ monthlyBudget: 0, transactions: [], goals, onboardingCompleted: false, pendingConfirmation });
  assert.deepEqual(snapshot.assistant.pendingConfirmation, pendingConfirmation);
  assert.deepEqual(snapshot.goals, goals);
  assert.equal((await saveAppState(snapshot, {
    fetchImpl,
    accessToken: 'jwt-a',
    expectedRevision: 2
  })).revision, 3);
  assert.deepEqual(await clearAppState({ fetchImpl, accessToken: 'jwt-a' }), { cleared: true });
  assert.deepEqual(calls.map((call) => call.options.method || 'GET'), ['GET', 'PUT', 'DELETE']);
  assert.ok(calls.every((call) => call.options.headers.authorization === 'Bearer jwt-a'));
  assert.equal(JSON.parse(calls[1].options.body).expectedRevision, 2);
  assert.ok(calls.every((call) => !('x-finance-device-id' in call.options.headers)));
});

test('state client requires a session token', async () => {
  await assert.rejects(() => loadAppState({ fetchImpl: async () => jsonResponse({}) }), /accessToken/);
});

test('state client exposes conflict status without silently retrying', async () => {
  await assert.rejects(
    () => saveAppState({}, {
      accessToken: 'jwt-a',
      expectedRevision: 2,
      fetchImpl: async () => jsonResponse({ error: '資料版本衝突', code: 'state_conflict' }, 409)
    }),
    (error) => error instanceof AppStateRequestError
      && error.status === 409
      && error.code === 'state_conflict'
  );
});
