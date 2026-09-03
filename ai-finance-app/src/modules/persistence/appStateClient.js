import { createDeviceHeaders, getDeviceIdentity } from './deviceIdentity.js';

const STATE_ENDPOINT = '/api/state';

const requestJson = async (url, options, fetchImpl) => {
  const response = await fetchImpl(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `資料接口回應 ${response.status}`);
  }
  return response.json();
};

export function createAppSnapshot({
  monthlyBudget,
  settings,
  transactions,
  goals,
  recurring,
  barcode,
  theme,
  onboardingCompleted,
  pendingConfirmation
}) {
  return {
    schemaVersion: 2,
    monthlyBudget: Number(monthlyBudget || 0),
    settings,
    transactions,
    goals,
    recurring,
    barcode,
    theme,
    onboardingCompleted: Boolean(onboardingCompleted),
    assistant: { pendingConfirmation: pendingConfirmation || null }
  };
}

export async function loadAppState({ fetchImpl = fetch, signal, deviceIdentity = getDeviceIdentity() } = {}) {
  const body = await requestJson(STATE_ENDPOINT, {
    headers: createDeviceHeaders(deviceIdentity),
    signal
  }, fetchImpl);
  return body.state ?? null;
}

export async function saveAppState(state, { fetchImpl = fetch, signal, deviceIdentity = getDeviceIdentity() } = {}) {
  const body = await requestJson(STATE_ENDPOINT, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...createDeviceHeaders(deviceIdentity) },
    body: JSON.stringify({ state }),
    signal
  }, fetchImpl);
  return body.state;
}

export async function clearAppState({ fetchImpl = fetch, deviceIdentity = getDeviceIdentity() } = {}) {
  return requestJson(STATE_ENDPOINT, {
    method: 'DELETE',
    headers: createDeviceHeaders(deviceIdentity)
  }, fetchImpl);
}
