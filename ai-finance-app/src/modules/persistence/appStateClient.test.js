import test from 'node:test';
import assert from 'node:assert/strict';
import { clearAppState, createAppSnapshot, loadAppState, saveAppState } from './appStateClient.js';

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json' }
});

test('client interface loads, saves and clears through one state endpoint', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (options.method === 'PUT') return jsonResponse({ state: JSON.parse(options.body).state });
    if (options.method === 'DELETE') return jsonResponse({ cleared: true });
    return jsonResponse({ state: { monthlyBudget: 4200 } });
  };

  const deviceIdentity = { id: 'device-test-001', claimLegacy: false };
  assert.deepEqual(await loadAppState({ fetchImpl, deviceIdentity }), { monthlyBudget: 4200 });
  const pendingConfirmation = { mode: 'missing_amount', item: { title: '飲料' } };
  const snapshot = createAppSnapshot({ monthlyBudget: 0, transactions: [], onboardingCompleted: false, pendingConfirmation });
  assert.deepEqual(snapshot.assistant.pendingConfirmation, pendingConfirmation);
  assert.equal((await saveAppState(snapshot, { fetchImpl, deviceIdentity })).monthlyBudget, 0);
  assert.deepEqual(await clearAppState({ fetchImpl, deviceIdentity }), { cleared: true });
  assert.deepEqual(calls.map((call) => call.options.method || 'GET'), ['GET', 'PUT', 'DELETE']);
  assert.ok(calls.every((call) => call.options.headers['x-finance-device-id'] === 'device-test-001'));
});

test('client reports backend errors instead of pretending data was saved', async () => {
  await assert.rejects(
    () => loadAppState({
      fetchImpl: async () => jsonResponse({ error: '離線' }, 503),
      deviceIdentity: { id: 'device-test-001', claimLegacy: false }
    }),
    /離線/
  );
});
