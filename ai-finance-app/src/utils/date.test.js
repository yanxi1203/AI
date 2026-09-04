import test from 'node:test';
import assert from 'node:assert/strict';
import { getDaysInMonth, getLocalDateKey, getLocalDay, getMonthKey, getPreviousMonthKey } from './date.js';

test('finance calendar dates use Taiwan time near the UTC day boundary', () => {
  const taiwanEarlyMorning = new Date('2026-08-19T00:30:00+08:00');

  assert.equal(getLocalDateKey(taiwanEarlyMorning), '2026-08-19');
  assert.equal(getMonthKey(taiwanEarlyMorning), '2026-08');
  assert.equal(getLocalDay(taiwanEarlyMorning), 19);
});

test('month helpers stay on the Taiwan calendar when the Node timezone differs', () => {
  const originalTimeZone = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    const taiwanMonthStart = new Date('2026-09-01T00:30:00+08:00');

    assert.equal(getLocalDateKey(taiwanMonthStart), '2026-09-01');
    assert.equal(getPreviousMonthKey(taiwanMonthStart), '2026-08');
    assert.equal(getDaysInMonth(taiwanMonthStart), 30);
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  }
});
