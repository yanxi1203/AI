import test from 'node:test';
import assert from 'node:assert/strict';
import { createFinanceSummary, createMonthFinanceSummary } from './financeSummary.js';

test('subtracts only flexible spending from the flexible monthly budget', () => {
  const summary = createFinanceSummary({
    now: new Date('2026-08-19T12:00:00+08:00'),
    monthlyBudget: 13300,
    paymentTasks: [{ id: 'rent', title: '房租', amount: 8500, dueDay: 5, kind: 'payment' }],
    transactions: [
      { id: 'rent-payment', type: 'expense', title: '房租', amount: 8500, date: '2026-08-19', recurringId: 'rent' },
      { id: 'lunch', type: 'expense', title: '午餐', amount: 110, date: '2026-08-19' }
    ]
  });

  assert.equal(summary.currentExpenses, 8610);
  assert.equal(summary.reservedExpenses, 8500);
  assert.equal(summary.flexibleExpenses, 110);
  assert.equal(summary.monthRemaining, 13190);
});

test('projects transactions, totals and categories for only the selected month', () => {
  const summary = createMonthFinanceSummary({
    monthKey: '2026-07',
    monthlyBudget: 5000,
    transactions: [
      { id: 'july-lunch', type: 'expense', title: '午餐', category: '飲食', amount: 120, date: '2026-07-31' },
      { id: 'july-bus', type: 'expense', title: '公車', category: '交通', amount: 30, date: '2026-07-02' },
      { id: 'july-income', type: 'income', title: '打工', amount: 3000, date: '2026-07-01' },
      { id: 'august-lunch', type: 'expense', title: '午餐', category: '飲食', amount: 200, date: '2026-08-01' }
    ]
  });

  assert.deepEqual(summary.transactions.map(({ id }) => id), ['july-lunch', 'july-bus', 'july-income']);
  assert.equal(summary.expenses, 150);
  assert.equal(summary.income, 3000);
  assert.equal(summary.remaining, 4850);
  assert.deepEqual(summary.categories, { 飲食: 120, 交通: 30 });
});

test('excludes reserved payments from the selected month flexible budget', () => {
  const summary = createMonthFinanceSummary({
    monthKey: '2026-07',
    monthlyBudget: 5000,
    paymentTasks: [{ id: 'rent', title: '房租', amount: 2000, kind: 'payment' }],
    transactions: [
      { id: 'rent-payment', recurringId: 'rent', type: 'expense', title: '房租', amount: 2000, date: '2026-07-05' },
      { id: 'dinner', type: 'expense', title: '晚餐', amount: 180, date: '2026-07-05' }
    ]
  });

  assert.equal(summary.expenses, 2180);
  assert.equal(summary.reservedExpenses, 2000);
  assert.equal(summary.flexibleExpenses, 180);
  assert.equal(summary.remaining, 4820);
});
