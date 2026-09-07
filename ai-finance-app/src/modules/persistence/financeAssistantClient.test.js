import test from 'node:test';
import assert from 'node:assert/strict';
import { sendFinanceMessage } from './financeAssistantClient.js';

test('finance assistant client sends the authenticated conversation state', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      result: { kind: 'transaction_added', transactions: [] },
      revision: 4
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const response = await sendFinanceMessage({
    text: '午餐 110 元',
    transactions: [{ id: 'existing' }],
    pendingConfirmation: null
  }, { fetchImpl, accessToken: 'jwt-a' });

  assert.equal(response.result.kind, 'transaction_added');
  assert.equal(response.revision, 4);
  assert.equal(request.url, '/api/assistant/message');
  assert.equal(request.options.headers.authorization, 'Bearer jwt-a');
  assert.equal(JSON.parse(request.options.body).transactions[0].id, 'existing');
  assert.equal(request.options.headers['x-finance-device-id'], undefined);
});

test('finance assistant client requires authentication and exposes backend errors', async () => {
  await assert.rejects(
    () => sendFinanceMessage({ text: '午餐 110 元', transactions: [] }),
    /accessToken/
  );
  await assert.rejects(
    () => sendFinanceMessage({ text: '午餐 110 元', transactions: [] }, {
      accessToken: 'jwt-a',
      fetchImpl: async () => new Response(JSON.stringify({ error: '無法處理' }), { status: 500 })
    }),
    /無法處理/
  );
});


test('finance assistant client preserves a 401 response for session handling', async () => {
  await assert.rejects(
    () => sendFinanceMessage({ text: '午餐 110 元', transactions: [] }, {
      accessToken: 'expired',
      fetchImpl: async () => new Response(JSON.stringify({ error: '登入狀態無效' }), { status: 401 })
    }),
    (error) => error.status === 401 && /登入狀態/.test(error.message)
  );
});
