import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from './appServer.js';
import { estimateGoal } from './services/goalEstimator.js';
import { processFinanceMessage } from '../src/modules/transactions/transactionAssistant.js';

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const close = (server) => new Promise((resolve) => server.close(resolve));
const deviceHeaders = (deviceId, additional = {}) => ({
  'x-finance-device-id': deviceId,
  ...additional
});

test('state HTTP interface loads, saves and clears one app snapshot', async () => {
  const states = new Map();
  const store = {
    load: async (deviceId) => states.get(deviceId) || null,
    save: async (deviceId, next) => (states.set(deviceId, next), next),
    clear: async (deviceId) => { states.delete(deviceId); }
  };
  const server = createAppServer({ store, logger: { error() {} } });
  await listen(server);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const headers = deviceHeaders('device-test-001');
    assert.deepEqual(await (await fetch(`${baseUrl}/api/state`, { headers })).json(), { state: null });
    const nextState = { monthlyBudget: 3000, transactions: [] };
    const saved = await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: deviceHeaders('device-test-001', { 'content-type': 'application/json' }),
      body: JSON.stringify({ state: nextState })
    });
    assert.equal(saved.status, 200);
    assert.deepEqual(await saved.json(), { state: nextState });
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/state`, { method: 'DELETE', headers })).status, 200);
    assert.deepEqual(await (await fetch(`${baseUrl}/api/state`, { headers })).json(), { state: null });
  } finally {
    await close(server);
  }
});

test('assistant message interface classifies and persists a clear expense', async () => {
  const states = new Map([['device-test-001', { transactions: [] }]]);
  const store = {
    load: async (deviceId) => states.get(deviceId) || null,
    save: async (deviceId, next) => (states.set(deviceId, next), next),
    clear: async (deviceId) => { states.delete(deviceId); }
  };
  const server = createAppServer({ store, financeMessageProcessor: processFinanceMessage, logger: { error() {} } });
  await listen(server);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/assistant/message`, {
      method: 'POST',
      headers: deviceHeaders('device-test-001', { 'content-type': 'application/json' }),
      body: JSON.stringify({ text: '午餐 110 元', transactions: [] })
    });
    const body = await response.json();
    assert.equal(body.result.kind, 'transaction_added');
    assert.equal(body.result.transactions[0].amount, 110);
    assert.equal(states.get('device-test-001').transactions[0].title, '午餐');
  } finally {
    await close(server);
  }
});

test('state and assistant routes isolate two devices', async () => {
  const states = new Map();
  const store = {
    load: async (deviceId) => states.get(deviceId) || null,
    save: async (deviceId, next) => (states.set(deviceId, next), next),
    clear: async (deviceId) => { states.delete(deviceId); }
  };
  const server = createAppServer({ store, financeMessageProcessor: processFinanceMessage, logger: { error() {} } });
  await listen(server);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const deviceA = deviceHeaders('device-user-a01', { 'content-type': 'application/json' });
  const deviceB = deviceHeaders('device-user-b01', { 'content-type': 'application/json' });

  try {
    await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: deviceA,
      body: JSON.stringify({ state: { monthlyBudget: 5000, transactions: [] } })
    });
    await fetch(`${baseUrl}/api/state`, {
      method: 'PUT',
      headers: deviceB,
      body: JSON.stringify({ state: { monthlyBudget: 9000, transactions: [] } })
    });
    await fetch(`${baseUrl}/api/assistant/message`, {
      method: 'POST',
      headers: deviceA,
      body: JSON.stringify({ text: '午餐 110 元' })
    });

    const stateA = await (await fetch(`${baseUrl}/api/state`, { headers: deviceA })).json();
    const stateB = await (await fetch(`${baseUrl}/api/state`, { headers: deviceB })).json();
    assert.equal(stateA.state.monthlyBudget, 5000);
    assert.equal(stateA.state.transactions[0].amount, 110);
    assert.equal(stateB.state.monthlyBudget, 9000);
    assert.deepEqual(stateB.state.transactions, []);

    await fetch(`${baseUrl}/api/state`, { method: 'DELETE', headers: deviceA });
    assert.equal((await (await fetch(`${baseUrl}/api/state`, { headers: deviceA })).json()).state, null);
    assert.equal((await (await fetch(`${baseUrl}/api/state`, { headers: deviceB })).json()).state.monthlyBudget, 9000);
  } finally {
    await close(server);
  }
});

test('assistant resumes a pending amount question from backend state', async () => {
  const states = new Map([['device-chat-001', { transactions: [], assistant: { pendingConfirmation: null } }]]);
  const store = {
    load: async (deviceId) => states.get(deviceId) || null,
    save: async (deviceId, next) => (states.set(deviceId, next), next),
    clear: async (deviceId) => { states.delete(deviceId); }
  };
  const server = createAppServer({ store, financeMessageProcessor: processFinanceMessage, logger: { error() {} } });
  await listen(server);
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/assistant/message`;
  const headers = deviceHeaders('device-chat-001', { 'content-type': 'application/json' });

  try {
    const first = await (await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: '我今天買了飲料' })
    })).json();
    assert.equal(first.result.kind, 'clarification');
    assert.equal(states.get('device-chat-001').assistant.pendingConfirmation.mode, 'missing_amount');

    const second = await (await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: '50' })
    })).json();
    assert.equal(second.result.kind, 'transaction_added');
    assert.equal(states.get('device-chat-001').transactions[0].amount, 50);
    assert.equal(states.get('device-chat-001').assistant.pendingConfirmation, null);
  } finally {
    await close(server);
  }
});

test('state routes reject requests without a device identity', async () => {
  const store = { load: async () => null, save: async (_id, next) => next, clear: async () => {} };
  const server = createAppServer({ store, logger: { error() {} } });
  await listen(server);
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/state`);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /裝置識別/);
  } finally {
    await close(server);
  }
});

test('goal estimate HTTP interface returns one shared estimate response', async () => {
  const store = { load: async () => null, save: async (_id, next) => next, clear: async () => {} };
  const server = createAppServer({ store, goalEstimator: estimateGoal, logger: { error() {} } });
  await listen(server);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/goals/estimate`, {
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
    assert.equal(body.estimate.goalType, 'product');
    assert.equal(body.estimate.title, '設計用筆電');
    assert.deepEqual(body.estimate.options.map(({ id }) => id), ['economy', 'balanced', 'comfortable']);
    assert.ok(body.estimate.breakdown.some(({ id }) => id === 'product'));
  } finally {
    await close(server);
  }
});

test('goal estimate HTTP interface explains insufficient data without inventing a price', async () => {
  const store = { load: async () => null, save: async (_id, next) => next, clear: async () => {} };
  const server = createAppServer({ store, goalEstimator: estimateGoal, logger: { error() {} } });
  await listen(server);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/goals/estimate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ goalType: 'event', title: '參加活動', requirements: {} })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /票價|自行填寫/);
  } finally {
    await close(server);
  }
});

test('state HTTP interface restores goal estimation details after a reload', async () => {
  const states = new Map();
  const store = {
    load: async (deviceId) => states.get(deviceId) || null,
    save: async (deviceId, next) => (states.set(deviceId, next), next),
    clear: async (deviceId) => { states.delete(deviceId); }
  };
  const server = createAppServer({ store, logger: { error() {} } });
  await listen(server);
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/api/state`;
  const headers = deviceHeaders('device-goal-reload', { 'content-type': 'application/json' });
  const goal = {
    id: 'goal_design_laptop',
    type: 'product',
    title: '設計用筆電',
    targetAmount: 45000,
    requirements: { productType: 'computer', usage: 'graphic_design' },
    estimation: { optionId: 'balanced', minAmount: 38000, maxAmount: 50000, recommendedAmount: 45000, sourceType: 'internal_reference', updatedAt: '2026-09-03' }
  };

  try {
    await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ state: { goals: [goal] } }) });
    const restored = await (await fetch(url, { headers })).json();
    assert.deepEqual(restored.state.goals[0], goal);
  } finally {
    await close(server);
  }
});
