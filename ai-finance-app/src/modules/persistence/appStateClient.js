const STATE_ENDPOINT = '/api/state';

export class AppStateRequestError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'AppStateRequestError';
    this.status = status;
    this.code = code;
  }
}

const authHeaders = (accessToken, additional = {}) => {
  if (!accessToken) throw new TypeError('accessToken 為必填');
  return { ...additional, authorization: `Bearer ${accessToken}` };
};

const requestJson = async (url, options, fetchImpl) => {
  const response = await fetchImpl(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AppStateRequestError(body.error || `資料接口回應 ${response.status}`, {
      status: response.status,
      code: body.code
    });
  }
  return body;
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

export async function loadAppState({ accessToken, fetchImpl = fetch, signal } = {}) {
  return requestJson(STATE_ENDPOINT, {
    headers: authHeaders(accessToken),
    signal
  }, fetchImpl);
}

export async function saveAppState(state, { accessToken, expectedRevision, fetchImpl = fetch, signal } = {}) {
  return requestJson(STATE_ENDPOINT, {
    method: 'PUT',
    headers: authHeaders(accessToken, { 'content-type': 'application/json' }),
    body: JSON.stringify({ state, expectedRevision }),
    signal
  }, fetchImpl);
}

export async function clearAppState({ accessToken, fetchImpl = fetch } = {}) {
  return requestJson(STATE_ENDPOINT, {
    method: 'DELETE',
    headers: authHeaders(accessToken)
  }, fetchImpl);
}
