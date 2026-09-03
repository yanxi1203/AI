import test from 'node:test';
import assert from 'node:assert/strict';
import { CLAIM_LEGACY_HEADER, createDeviceHeaders, DEVICE_ID_HEADER, getDeviceIdentity } from './deviceIdentity.js';

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value))
  };
};

test('new device receives a stable isolated identity without claiming old data', () => {
  const storage = createStorage();
  const cryptoImpl = { randomUUID: () => 'device-new-user-001' };
  const first = getDeviceIdentity({ storage, cryptoImpl });
  const second = getDeviceIdentity({ storage, cryptoImpl: { randomUUID: () => 'different-id' } });

  assert.deepEqual(first, { id: 'device-new-user-001', claimLegacy: false });
  assert.deepEqual(second, first);
  assert.deepEqual(createDeviceHeaders(first), { [DEVICE_ID_HEADER]: 'device-new-user-001' });
});

test('an upgraded device with meaningful local data can claim the legacy backend state', () => {
  const storage = createStorage({
    ai_butler_onboarding_complete: 'true',
    ai_butler_transactions: JSON.stringify([{ id: 'tx_existing' }])
  });
  const identity = getDeviceIdentity({ storage, cryptoImpl: { randomUUID: () => 'device-existing-001' } });

  assert.equal(identity.claimLegacy, true);
  assert.deepEqual(createDeviceHeaders(identity), {
    [DEVICE_ID_HEADER]: 'device-existing-001',
    [CLAIM_LEGACY_HEADER]: '1'
  });
});
