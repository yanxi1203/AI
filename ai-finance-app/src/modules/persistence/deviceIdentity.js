export const DEVICE_ID_HEADER = 'x-finance-device-id';
export const CLAIM_LEGACY_HEADER = 'x-finance-claim-legacy';

const DEVICE_ID_KEY = 'ai_butler_device_id';
const CLAIM_LEGACY_KEY = 'ai_butler_claim_legacy';
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

const safeJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const hasMeaningfulLegacyData = (storage) => {
  if (storage.getItem('ai_butler_onboarding_complete') === 'true') return true;
  if (Number(storage.getItem('ai_butler_monthly_budget') || 0) > 0) return true;
  if ((storage.getItem('ai_butler_einvoice') || '').trim()) return true;

  for (const key of ['ai_butler_transactions', 'ai_butler_dream_goals', 'ai_butler_recurring']) {
    const value = safeJson(storage.getItem(key));
    if (Array.isArray(value) && value.length > 0) return true;
  }

  const settings = safeJson(storage.getItem('ai_butler_settings'));
  return Boolean(settings && (
    (settings.name && settings.name !== 'Fin')
    || Number(settings.profile?.monthlyIncome || 0) > 0
    || Number(settings.profile?.fixedExpenses || 0) > 0
  ));
};

const createDeviceId = (cryptoImpl) => {
  const uuid = cryptoImpl?.randomUUID?.();
  if (uuid && DEVICE_ID_PATTERN.test(uuid)) return uuid;
  return `device_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
};

export function getDeviceIdentity({ storage = globalThis.localStorage, cryptoImpl = globalThis.crypto } = {}) {
  if (!storage) throw new Error('目前環境無法保存裝置識別');

  const existingId = storage.getItem(DEVICE_ID_KEY);
  if (existingId && DEVICE_ID_PATTERN.test(existingId)) {
    return {
      id: existingId,
      claimLegacy: storage.getItem(CLAIM_LEGACY_KEY) === 'true'
    };
  }

  const identity = {
    id: createDeviceId(cryptoImpl),
    claimLegacy: hasMeaningfulLegacyData(storage)
  };
  storage.setItem(DEVICE_ID_KEY, identity.id);
  storage.setItem(CLAIM_LEGACY_KEY, String(identity.claimLegacy));
  return identity;
}

export function createDeviceHeaders(identity = getDeviceIdentity()) {
  return {
    [DEVICE_ID_HEADER]: identity.id,
    ...(identity.claimLegacy ? { [CLAIM_LEGACY_HEADER]: '1' } : {})
  };
}
