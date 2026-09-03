import { estimateGoal } from '../../../server/services/goalEstimator.js';

const ESTIMATE_ENDPOINT = '/api/goals/estimate';

async function requestBackendEstimate(payload, fetchImpl) {
  const response = await fetchImpl(ESTIMATE_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `夢想估算接口回應 ${response.status}`);
  if (body.status !== 'estimated' || !body.estimate) throw new Error('夢想估算回應格式不正確');
  return { ...body, offline: false };
}

export async function requestGoalEstimate(payload, { fetchImpl = fetch, fallbackEstimator = estimateGoal } = {}) {
  try {
    return await requestBackendEstimate(payload, fetchImpl);
  } catch (backendError) {
    try {
      const estimate = fallbackEstimator(payload);
      return {
        status: 'estimated',
        offline: true,
        estimate: {
          ...estimate,
          source: {
            ...estimate.source,
            type: 'offline_reference',
            disclaimer: `離線參考估算；${estimate.source?.disclaimer || '此為參考估算，並非即時報價。'}`
          }
        }
      };
    } catch (fallbackError) {
      if (fallbackError instanceof TypeError) throw fallbackError;
      throw new Error(`目前無法完成夢想估算：${backendError.message}`);
    }
  }
}
