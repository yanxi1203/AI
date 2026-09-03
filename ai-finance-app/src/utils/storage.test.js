import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSettings } from './storage.js';

test('settings migration treats a missing zero income as pending', () => {
  const settings = normalizeSettings({ profile: { monthlyIncome: 0 }, allocation: {} });

  assert.equal(settings.profile.incomeUnknown, true);
  assert.equal(settings.allocation.status, 'pending-income');
});

test('settings migration keeps an older known income ready', () => {
  const settings = normalizeSettings({
    profile: { monthlyIncome: 15000 },
    allocation: { flexible: 9000 }
  });

  assert.equal(settings.profile.incomeUnknown, false);
  assert.equal(settings.allocation.status, 'ready');
  assert.equal(settings.allocation.flexible, 9000);
});
