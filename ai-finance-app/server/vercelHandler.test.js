import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppHandler } from './appServer.js';
import { AuthenticationError } from './authContext.js';
import { StateConflictError } from './supabaseStateStore.js';
import { estimateGoal } from './services/goalEstimator.js';
import { processFinanceMessage } from '../src/modules/transactions/transactionAssistant.js';
import { getAppHandler } from '../api/[...route].js';

const USER_ID = '33333333-3333-4333-8333-333333333333';

function createMockResponse() {
  return {
    statusCode: null,
    headers: {},
    body: '',
    writeHead(status, headers = {}) {
      this.statusCode = status;
      this.headers = { ...this.headers, ...headers };
      return this;
    },
    end(data) {
      this.body = data || '';
      return this;
    },
    json() {
      return JSON.parse(this.body || '{}');
    }
  };
}

function createHarness() {
  let stateRecord = { state: null, revision: 0 };
  const store = {
    async load() {
      return stateRecord;
    },
    async save(_auth, state, { expectedRevision }) {
      if (stateRecord.revision !== expectedRevision) throw new StateConflictError();
      stateRecord = { state, revision: stateRecord.revision + 1 };
      return stateRecord;
    },
    async clear() {
      stateRecord = { state: null, revision: 0 };
    }
  };
  const authenticateRequest = async (request) => {
    const authHeader = request.headers?.authorization;
    if (authHeader === 'Bearer valid-token') {
      return { userId: USER_ID, accessToken: 'valid-token' };
    }
    throw new AuthenticationError();
  };
  return { store, authenticateRequest };
}

test('createAppHandler processes GET /api/health', async () => {
  const handler = createAppHandler({
    ...createHarness(),
    logger: { error() {} }
  });
  const req = { method: 'GET', url: '/api/health', headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { status: 'ok' });
});

test('createAppHandler normalizes pathname without /api prefix', async () => {
  const handler = createAppHandler({
    ...createHarness(),
    logger: { error() {} }
  });
  const req = { method: 'GET', url: '/health', headers: {} };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { status: 'ok' });
});

test('createAppHandler supports Vercel pre-parsed request body for /api/goals/estimate', async () => {
  const handler = createAppHandler({
    ...createHarness(),
    goalEstimator: estimateGoal,
    logger: { error() {} }
  });
  const req = {
    method: 'POST',
    url: '/api/goals/estimate',
    headers: { 'content-type': 'application/json' },
    body: {
      goalType: 'product',
      title: '工作筆電',
      requirements: { productType: 'computer', usage: 'graphic_design', level: 'balanced' }
    }
  };
  const res = createMockResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  const data = res.json();
  assert.equal(data.status, 'estimated');
  assert.ok(Array.isArray(data.estimate?.options));
});

test('createAppHandler supports state lifecycle and pre-parsed body on Vercel', async () => {
  const harness = createHarness();
  const handler = createAppHandler({
    ...harness,
    financeMessageProcessor: processFinanceMessage,
    logger: { error() {} }
  });

  // 1. GET state
  const getReq = {
    method: 'GET',
    url: '/api/state',
    headers: { authorization: 'Bearer valid-token' }
  };
  const getRes = createMockResponse();
  await handler(getReq, getRes);
  assert.equal(getRes.statusCode, 200);
  assert.deepEqual(getRes.json(), { state: null, revision: 0 });

  // 2. PUT state with pre-parsed body
  const putReq = {
    method: 'PUT',
    url: '/api/state',
    headers: { authorization: 'Bearer valid-token' },
    body: { state: { monthlyBudget: 6000, transactions: [] }, expectedRevision: 0 }
  };
  const putRes = createMockResponse();
  await handler(putReq, putRes);
  assert.equal(putRes.statusCode, 200);
  assert.equal(putRes.json().revision, 1);

  // 3. POST assistant message with pre-parsed body
  const postReq = {
    method: 'POST',
    url: '/api/assistant/message',
    headers: { authorization: 'Bearer valid-token' },
    body: { text: '晚餐 200 元' }
  };
  const postRes = createMockResponse();
  await handler(postReq, postRes);
  assert.equal(postRes.statusCode, 200);
  assert.equal(postRes.json().result.kind, 'transaction_added');
  assert.equal(postRes.json().revision, 2);

  // 4. DELETE state
  const delReq = {
    method: 'DELETE',
    url: '/api/state',
    headers: { authorization: 'Bearer valid-token' }
  };
  const delRes = createMockResponse();
  await handler(delReq, delRes);
  assert.equal(delRes.statusCode, 200);
  assert.deepEqual(delRes.json(), { cleared: true });
});

test('getAppHandler initializes handler singleton with server config', () => {
  const env = {
    SUPABASE_URL: 'https://test-project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key'
  };
  const handler = getAppHandler(env);
  assert.equal(typeof handler, 'function');
});
