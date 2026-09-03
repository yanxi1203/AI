import { createDeviceHeaders, getDeviceIdentity } from './deviceIdentity.js';

const MESSAGE_ENDPOINT = '/api/assistant/message';

export async function sendFinanceMessage({ text, transactions, pendingConfirmation }, { fetchImpl = fetch, deviceIdentity = getDeviceIdentity() } = {}) {
  const response = await fetchImpl(MESSAGE_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...createDeviceHeaders(deviceIdentity) },
    body: JSON.stringify({ text, transactions, pendingConfirmation })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `管家接口回應 ${response.status}`);
  if (!body.result || typeof body.result.kind !== 'string') throw new Error('管家接口回傳格式不正確');
  return body.result;
}
