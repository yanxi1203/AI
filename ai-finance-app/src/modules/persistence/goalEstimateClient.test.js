import test from 'node:test';
import assert from 'node:assert/strict';
import { requestGoalEstimate } from './goalEstimateClient.js';

const payload = {
  goalType: 'product',
  title: '設計用筆電',
  requirements: { productType: 'computer', usage: 'graphic_design', level: 'balanced' }
};

test('goal estimate client returns the backend response', async () => {
  const calls = [];
  const response = await requestGoalEstimate(payload, {
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        status: 'estimated',
        estimate: { goalType: 'product', source: { type: 'internal_reference' } }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
  });

  assert.equal(response.status, 'estimated');
  assert.equal(response.offline, false);
  assert.equal(calls[0].url, '/api/goals/estimate');
  assert.deepEqual(JSON.parse(calls[0].options.body), payload);
});

test('goal estimate client labels its local fallback as offline', async () => {
  const response = await requestGoalEstimate(payload, {
    fetchImpl: async () => { throw new Error('network unavailable'); }
  });

  assert.equal(response.status, 'estimated');
  assert.equal(response.offline, true);
  assert.equal(response.estimate.source.type, 'offline_reference');
  assert.match(response.estimate.source.disclaimer, /離線參考估算/);
});
