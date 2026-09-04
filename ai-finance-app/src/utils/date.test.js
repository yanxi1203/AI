import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocalDateKey, getLocalDay, getMonthKey } from './date.js';

test('finance calendar dates use Taiwan time near the UTC day boundary', () => {
  const taiwanEarlyMorning = new Date('2026-08-19T00:30:00+08:00');

  assert.equal(getLocalDateKey(taiwanEarlyMorning), '2026-08-19');
  assert.equal(getMonthKey(taiwanEarlyMorning), '2026-08');
  assert.equal(getLocalDay(taiwanEarlyMorning), 19);
});
