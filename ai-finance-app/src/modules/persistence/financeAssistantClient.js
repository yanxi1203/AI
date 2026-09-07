const MESSAGE_ENDPOINT = '/api/assistant/message';

export class FinanceAssistantRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'FinanceAssistantRequestError';
    this.status = status;
  }
}

export async function sendFinanceMessage(
  { text, transactions, pendingConfirmation },
  { accessToken, fetchImpl = fetch } = {}
) {
  if (!accessToken) throw new TypeError('accessToken 為必填');
  const response = await fetchImpl(MESSAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ text, transactions, pendingConfirmation })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new FinanceAssistantRequestError(
      body.error || `管家接口回應 ${response.status}`,
      response.status
    );
  }
  if (!body.result || typeof body.result.kind !== 'string') throw new Error('管家接口回傳格式不正確');
  return { result: body.result, revision: body.revision };
}
