import { createServer } from 'node:http';

// The development runner watches this module and restarts the local API after changes.

const MAX_BODY_BYTES = 1_000_000;
const DEVICE_ID_HEADER = 'x-finance-device-id';
const CLAIM_LEGACY_HEADER = 'x-finance-claim-legacy';
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(body));
};

async function readJsonBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new RangeError('資料超過 1 MB 上限');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const writesTransactions = (kind) => ['transaction_added', 'transactions_added', 'transaction_corrected'].includes(kind);

const readDeviceContext = (request) => {
  const deviceId = request.headers[DEVICE_ID_HEADER];
  if (typeof deviceId !== 'string' || !DEVICE_ID_PATTERN.test(deviceId)) {
    throw new TypeError('缺少有效的裝置識別');
  }
  return {
    deviceId,
    claimLegacy: request.headers[CLAIM_LEGACY_HEADER] === '1'
  };
};

export function createAppServer({ store, financeMessageProcessor, goalEstimator, logger = console }) {
  if (!store) throw new TypeError('store 為必填');

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { status: 'ok' });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/state') {
        const { deviceId, claimLegacy } = readDeviceContext(request);
        sendJson(response, 200, { state: await store.load(deviceId, { claimLegacy }) });
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/api/state') {
        const { deviceId } = readDeviceContext(request);
        const body = await readJsonBody(request);
        sendJson(response, 200, { state: await store.save(deviceId, body.state) });
        return;
      }

      if (request.method === 'DELETE' && url.pathname === '/api/state') {
        const { deviceId } = readDeviceContext(request);
        await store.clear(deviceId);
        sendJson(response, 200, { cleared: true });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/assistant/message') {
        const { deviceId, claimLegacy } = readDeviceContext(request);
        if (typeof financeMessageProcessor !== 'function') throw new Error('尚未設定自然語言處理模組');
        const body = await readJsonBody(request);
        if (typeof body.text !== 'string' || !body.text.trim()) throw new TypeError('text 為必填');
        const currentState = await store.load(deviceId, { claimLegacy });
        const transactions = Array.isArray(body.transactions)
          ? body.transactions
          : currentState?.transactions || [];
        const result = financeMessageProcessor({
          text: body.text,
          transactions,
          pendingConfirmation: body.pendingConfirmation
            || currentState?.assistant?.pendingConfirmation
            || null
        });

        await store.save(deviceId, {
          ...(currentState || {}),
          transactions: writesTransactions(result.kind) ? result.transactions : transactions,
          assistant: { pendingConfirmation: result.pendingConfirmation || null }
        });
        sendJson(response, 200, { result });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/goals/estimate') {
        if (typeof goalEstimator !== 'function') throw new Error('尚未設定夢想估算模組');
        const body = await readJsonBody(request);
        const estimate = goalEstimator({
          goalType: body.goalType,
          title: body.title,
          requirements: body.requirements
        });
        sendJson(response, 200, { status: 'estimated', estimate });
        return;
      }

      sendJson(response, 404, { error: '找不到這個接口' });
    } catch (error) {
      const isBadRequest = error instanceof SyntaxError || error instanceof TypeError || error instanceof RangeError;
      if (!isBadRequest) logger.error(error);
      sendJson(response, isBadRequest ? 400 : 500, {
        error: isBadRequest ? error.message : '伺服器暫時無法處理資料'
      });
    }
  });
}
