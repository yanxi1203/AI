import { createServer } from 'node:http';
import { AuthenticationError } from './authContext.js';
import { StateConflictError } from './supabaseStateStore.js';

const MAX_BODY_BYTES = 1_000_000;

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

const writesTransactions = (kind) =>
  ['transaction_added', 'transactions_added', 'transaction_corrected'].includes(kind);

const requireAuthentication = async (request, authenticateRequest) => {
  if (typeof authenticateRequest !== 'function') {
    throw new Error('後端尚未設定 Supabase 登入驗證');
  }
  return authenticateRequest(request);
};

export function createAppServer({
  store,
  authenticateRequest,
  financeMessageProcessor,
  goalEstimator,
  logger = console
}) {
  if (!store) throw new TypeError('store 為必填');

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { status: 'ok' });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/state') {
        const auth = await requireAuthentication(request, authenticateRequest);
        sendJson(response, 200, await store.load(auth));
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/api/state') {
        const auth = await requireAuthentication(request, authenticateRequest);
        const body = await readJsonBody(request);
        const saved = await store.save(auth, body.state, { expectedRevision: body.expectedRevision });
        sendJson(response, 200, saved);
        return;
      }

      if (request.method === 'DELETE' && url.pathname === '/api/state') {
        const auth = await requireAuthentication(request, authenticateRequest);
        await store.clear(auth);
        sendJson(response, 200, { cleared: true });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/assistant/message') {
        const auth = await requireAuthentication(request, authenticateRequest);
        if (typeof financeMessageProcessor !== 'function') throw new Error('尚未設定自然語言處理模組');
        const body = await readJsonBody(request);
        if (typeof body.text !== 'string' || !body.text.trim()) throw new TypeError('text 為必填');

        const current = await store.load(auth);
        const transactions = Array.isArray(body.transactions)
          ? body.transactions
          : current.state?.transactions || [];
        const result = financeMessageProcessor({
          text: body.text,
          transactions,
          pendingConfirmation: body.pendingConfirmation
            || current.state?.assistant?.pendingConfirmation
            || null
        });

        const saved = await store.save(auth, {
          ...(current.state || {}),
          transactions: writesTransactions(result.kind) ? result.transactions : transactions,
          assistant: { pendingConfirmation: result.pendingConfirmation || null }
        }, { expectedRevision: current.revision });
        sendJson(response, 200, { result, revision: saved.revision });
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
      const status = error instanceof AuthenticationError
        ? 401
        : error instanceof StateConflictError
          ? 409
          : isBadRequest
            ? 400
            : 500;
      if (status === 500) logger.error(error);
      sendJson(response, status, {
        error: status === 500 ? '伺服器暫時無法處理資料' : error.message,
        ...(error.code ? { code: error.code } : {})
      });
    }
  });
}
