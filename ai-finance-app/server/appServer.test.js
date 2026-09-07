import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from './appServer.js';
import { AuthenticationError } from './authContext.js';
import { StateConflictError } from './supabaseStateStore.js';
import { estimateGoal } from './services/goalEstimator.js';
import { processFinanceMessage } from '../src/modules/transactions/transactionAssistant.js';

const USER_A = '11111111-1111-4111-8111-111111111111';
const USER_B = '22222222-2222-4222-8222-222222222222';
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const close = (server) => new Promise((resolve) => server.close(resolve));
const authHeaders = (token, additional = {}) => ({
  authorization: `Bearer ${token}`,
  ...additional
});

function createHarness() {
  const states = new Map();
  const store = {
    async load({ userId }) {
      return states.get(userId) || { state: null, revision: 0 };
    },
    async save({ userId }, state, { expectedRevision }) {
      const current = states.get(userId) || { state: null, revision: 0 };
      if (current.revision !== expectedRevision) throw new StateConflictError();
      const saved = { state, revision: current.revision + 1 };
      states.set(userId, saved);
      return saved;
    },
    async clear({ userId }) {
      states.delete(userId);
    }
  };
  const authenticateRequest = async (request) => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token === 'token-a') return { userId: USER_A, accessToken: token };
    if (token === 'token-b') return { userId: USER_B, accessToken: token };
    throw new AuthenticationError();
  };
  return { states, store, authenticateRequest };
}

test('authenticated state interface loads, saves and clears one user snapshot', async () => {
  const harness = createHarness();
  const server = createAppServer({ ...harness, logger: { error() {} } });
  await listen(server);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const headers = authHeaders('token-a');

  try {
    assert.deepEqual(await (await fetch(`${baseUrl}/api/state`, { headers })).json(), { state: null, revision: 0 });
    const nextState = { monthlyBudget: 3000, transactions: [] };
    const saved = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: authHeaders('token-a', { 'content-type': 'application/json' }),
      body: JSON.stringify({ state: nextState, expectedRevision: 0 })
    });
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { state: nextState, revision: 1 });
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/state`, { method: 'DELETE', headers })).status, 200);
    assert.deepEqual(await (await fetch(`${baseUrl}/api/state`, { headers })).json(), { state: null, revision: 0 });
  } finally {
    await close(server);
  }
});

test('verified identities isolate state even if request body tries to spoof an owner', async () => {
  const harness = createHarness();
  const server = createAppServer({ ...harness, logger: { error() {} } });
  await listen(server);
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/state`;

  try {
    await fetch(baseUrl, {
      method: 'PUT',
      headers: authHeaders('token-a', { 'content-type': 'application/json' }),
      body: JSON.stringify({ user_id: USER_B, state: { monthlyBudget: 5000 }, expectedRevision: 0 })
    });
    await fetch(baseUrl, {
      method: 'PUT',
      headers: authHeaders('token-b', { 'content-type': 'application/json' }),
      body: JSON.stringify({ state: { monthlyBudget: 9000 }, expectedRevision: 0 })
    });
    assert.equal((await (await fetch(baseUrl, { headers: authHeaders('token-a') })).json()).state.monthlyBudget, 5000);
    assert.equal((await (await fetch(baseUrl, { headers: authHeaders('token-b') })).json()).state.monthlyBudget, 9000);
    assert.equal(harness.states.get(USER_A).state.monthlyBudget, 5000);
  } finally {
    await close(server);
  }
});

test('state and assistant routes reject missing, expired and forged credentials with 401', async () => {
  const harness = createHarness();
  const server = createAppServer({
    ...harness,
    financeMessageProcessor: processFinanceMessage,
    logger: { error() {} }
  });
  await listen(server);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    assert.equal((await fetch(`${baseUrl}/api/state`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/state`, { headers: authHeaders('forged') })).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/assistant/message`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '午餐 110 元' })
    })).status, 401);
    assert.equal(harness.states.size, 0);
  } finally {
    await close(server);
  }
});

test('assistant route persists only the authenticated user state', async () => {
  const harness = createHarness();
  harness.states.set(USER_A, { state: { transactions: [] }, revision: 1 });
  harness.states.set(USER_B, { state: { monthlyBudget: 8000, transactions: [] }, revision: 1 });
  const server = createAppServer({
    ...harness,
    financeMessageProcessor: processFinanceMessage,
    logger: { error() {} }
  });
  await listen(server);
  const url = `http://127.0.0.1:${server.address().port}/api/assistant/message`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders('token-a', { 'content-type': 'application/json' }),
      body: JSON.stringify({ text: '午餐 110 元', transactions: [] })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.result.kind, 'transaction_added');
    assert.equal(harness.states.get(USER_A).state.transactions[0].amount, 110);
    assert.deepEqual(harness.states.get(USER_B).state.transactions, []);
  } finally {
    await close(server);
  }
});

test('stale state write returns 409 and does not overwrite current data', async () => {
  const harness = createHarness();
  harness.states.set(USER_A, { state: { monthlyBudget: 5000 }, revision: 2 });
  const server = createAppServer({ ...harness, logger: { error() {} } });
  await listen(server);
  const url = `http://127.0.0.1:${server.address().port}/api/state`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: authHeaders('token-a', { 'content-type': 'application/json' }),
      body: JSON.stringify({ state: { monthlyBudget: 1 }, expectedRevision: 1 })
    });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, 'state_conflict');
    assert.equal(harness.states.get(USER_A).state.monthlyBudget, 5000);
  } finally {
    await close(server);
  }
});

test('goal estimation remains public and unchanged', async () => {
  const harness = createHarness();
  const server = createAppServer({ ...harness, goalEstimator: estimateGoal, logger: { error() {} } });
  await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/goals/estimate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        goalType: 'product',
        title: '設計用筆電',
        requirements: { productType: 'computer', usage: 'graphic_design', level: 'balanced' }
      })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'estimated');
    assert.deepEqual(body.estimate.options.map(({ id }) => id), ['economy', 'balanced', 'comfortable']);
  } finally {
    await close(server);
  }
});
