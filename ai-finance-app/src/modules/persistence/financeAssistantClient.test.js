import test from 'node:test';
import assert from 'node:assert/strict';
import { sendFinanceMessage } from './financeAssistantClient.js';

test('finance assistant client sends the current conversation state', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ result: { kind: 'transaction_added', transactions: [] } }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const result = await sendFinanceMessage({
    text: '午餐 110 元',
    transactions: [{ id: 'existing' }],
    pendingConfirmation: null
  }, { fetchImpl, deviceIdentity: { id: 'device-test-001', claimLegacy: false } });

  assert.equal(result.kind, 'transaction_added');
  assert.equal(request.url, '/api/assistant/message');
  assert.equal(request.options.headers['x-finance-device-id'], 'device-test-001');
  assert.equal(JSON.parse(request.options.body).transactions[0].id, 'existing');
});

test('finance assistant client exposes backend errors', async () => {
  await assert.rejects(
    () => sendFinanceMessage({ text: '午餐 110 元', transactions: [] }, {
      fetchImpl: async () => new Response(JSON.stringify({ error: '無法處理' }), { status: 500 }),
      deviceIdentity: { id: 'device-test-001', claimLegacy: false }
    }),
    /無法處理/
  );
});
