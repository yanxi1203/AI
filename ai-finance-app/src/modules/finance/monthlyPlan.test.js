import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPaymentTask,
  createMonthlyPlan,
  createFinancialSetup,
  findPaymentTaskMatches,
  getRecurringCycleKey,
  isPaymentTask,
  isRecurringCompleted,
  isReservedTransaction,
  shouldShowRecurringReminder,
  syncFixedItemsToPaymentTasks,
  validateFixedItems
} from './monthlyPlan.js';

test('a fixed expense stays a payment task even when the due day is unknown', () => {
  const task = createPaymentTask({
    id: 'rent',
    title: ' 房租 ',
    amount: '8500',
    dueDay: ''
  });

  assert.equal(task.title, '房租');
  assert.equal(task.amount, 8500);
  assert.equal(task.dueDay, null);
  assert.equal(task.kind, 'payment');
  assert.equal(task.isFixedExpense, true);
  assert.equal(isPaymentTask(task), true);
});

test('reserves multiple fixed expenses before calculating flexible budget', () => {
  const plan = createMonthlyPlan({
    incomeAmount: 29500,
    fixedItems: [
      { id: 'transport', title: '交通', amount: 1200 },
      { id: 'rent', title: '房租', amount: 8500 },
      { id: 'gym', title: '健身房', amount: 600 }
    ],
    desiredSavings: 5900
  });

  assert.equal(plan.fixedReserved, 10300);
  assert.equal(plan.plannedSavings, 5900);
  assert.equal(plan.flexibleBudget, 13300);
});

test('recommends twenty percent savings after fixed expenses when left blank', () => {
  const plan = createMonthlyPlan({
    incomeAmount: 15000,
    fixedItems: [{ id: 'rent', title: '房租', amount: 3000 }]
  });

  assert.equal(plan.plannedSavings, 2400);
  assert.equal(plan.flexibleBudget, 9600);
});

test('reports shortfall when fixed expenses exceed income', () => {
  const plan = createMonthlyPlan({
    incomeAmount: 8000,
    fixedItems: [
      { id: 'rent', title: '房租', amount: 9000 },
      { id: 'transport', title: '交通', amount: 1200 }
    ]
  });

  assert.equal(plan.shortfall, 2200);
  assert.equal(plan.plannedSavings, 0);
  assert.equal(plan.flexibleBudget, 0);
});

test('keeps an unknown income pending instead of reporting a false shortfall', () => {
  const plan = createMonthlyPlan({
    incomeKnown: false,
    fixedItems: [{ id: 'rent', title: '房租', amount: 9000 }],
    desiredSavings: 2000
  });

  assert.equal(plan.incomeKnown, false);
  assert.equal(plan.status, 'pending-income');
  assert.equal(plan.fixedReserved, 9000);
  assert.equal(plan.shortfall, null);
  assert.equal(plan.requestedSavings, 2000);
  assert.equal(plan.plannedSavings, 0);
  assert.equal(plan.flexibleBudget, 0);
});

test('builds one consistent financial setup for settings and the monthly budget', () => {
  const setup = createFinancialSetup({
    incomeAmount: 15000,
    fixedItems: [{ id: 'rent', type: '房租住宿', title: '房租', amount: 3000 }],
    desiredSavings: 2400,
    now: new Date('2026-08-26T10:00:00.000Z')
  });

  assert.equal(setup.monthlyBudget, 9600);
  assert.equal(setup.profile.monthlyIncome, 15000);
  assert.equal(setup.profile.fixedExpenses, 3000);
  assert.equal(setup.profile.desiredSavings, 2400);
  assert.equal(setup.allocation.flexible, 9600);
  assert.equal(setup.allocation.status, 'ready');
  assert.equal(setup.allocation.calculatedAt, '2026-08-26T10:00:00.000Z');
});

test('financial setup keeps an unknown income pending without inventing a zero budget', () => {
  const setup = createFinancialSetup({
    incomeKnown: false,
    fixedItems: [{ id: 'phone', type: '手機網路', title: '手機費', amount: 499 }],
    desiredSavings: 1000
  });

  assert.equal(setup.profile.incomeUnknown, true);
  assert.equal(setup.profile.desiredSavings, 1000);
  assert.equal(setup.allocation.status, 'pending-income');
  assert.equal(setup.allocation.shortfall, null);
  assert.equal(setup.monthlyBudget, 0);
});

test('financial setup remembers a requested saving amount even when this month must clamp it', () => {
  const setup = createFinancialSetup({ incomeAmount: 3000, desiredSavings: 5000 });

  assert.equal(setup.profile.desiredSavings, 5000);
  assert.equal(setup.allocation.savings, 3000);
  assert.equal(setup.monthlyBudget, 0);
});

test('flags every selected fixed expense that still needs a positive amount', () => {
  const result = validateFixedItems([
    { id: 'transport', title: '交通', amount: '' },
    { id: 'rent', title: '房租', amount: 0 },
    { id: 'phone', title: '手機', amount: 499 }
  ]);

  assert.equal(result.isValid, false);
  assert.equal(result.invalidCount, 2);
  assert.deepEqual(result.invalidIds, ['transport', 'rent']);
  assert.equal(validateFixedItems([{ id: 'phone', amount: '499' }]).isValid, true);
});

test('sync keeps quick templates while replacing onboarding payment tasks', () => {
  const synced = syncFixedItemsToPaymentTasks(
    [{ id: 'rent', title: '房租', type: '房租住宿', amount: 8500 }],
    [
      { id: 'bus', title: '平日公車', amount: 15, kind: 'template' },
      { id: 'old-rent', planFixedItemId: 'rent', title: '舊房租', amount: 8000, dueDay: 5, kind: 'payment' }
    ]
  );

  assert.equal(synced.length, 2);
  assert.equal(synced.find((item) => item.id === 'bus').title, '平日公車');
  const rent = synced.find((item) => item.planFixedItemId === 'rent');
  assert.equal(rent.amount, 8500);
  assert.equal(rent.dueDay, 5);
});

test('onboarding fixed items replace payment tasks that are no longer selected', () => {
  const synced = syncFixedItemsToPaymentTasks(
    [{ id: 'transport', title: '交通', type: '交通通勤', amount: 1200 }],
    [
      { id: 'bus', title: '平日公車', amount: 15, kind: 'template' },
      { id: 'demo-rent', title: '示範房租', amount: 10000, dueDay: 5, kind: 'payment' }
    ]
  );

  assert.equal(synced.some((item) => item.id === 'bus'), true);
  assert.equal(synced.some((item) => item.id === 'demo-rent'), false);
  assert.equal(synced.some((item) => item.planFixedItemId === 'transport'), true);
});

test('fixed payment transactions do not count against flexible budget twice', () => {
  const tasks = [{ id: 'rent', title: '房租', dueDay: 5, kind: 'payment' }];
  assert.equal(isReservedTransaction({ type: 'expense', title: '房租', amount: 8500, recurringId: 'rent' }, tasks), true);
  assert.equal(isReservedTransaction({ type: 'expense', title: '午餐', amount: 110 }, tasks), false);
});

test('monthly payment stays completed for the rest of the month', () => {
  const now = new Date('2026-08-19T12:00:00+08:00');
  const task = { kind: 'payment', frequency: 'monthly', lastCompletedCycle: '2026-08' };

  assert.equal(getRecurringCycleKey(task, now), '2026-08');
  assert.equal(isRecurringCompleted(task, now), true);
  assert.equal(shouldShowRecurringReminder(task, now), false);
});

test('payment reminder appears five days before its due day', () => {
  const task = { kind: 'payment', dueDay: 20, enabled: true };

  assert.equal(shouldShowRecurringReminder(task, new Date('2026-08-14T12:00:00+08:00')), false);
  assert.equal(shouldShowRecurringReminder(task, new Date('2026-08-15T12:00:00+08:00')), true);
});

test('completed monthly bill reminds for the next cycle across a month boundary', () => {
  const task = {
    kind: 'payment',
    dueDay: 1,
    enabled: true,
    lastCompletedCycle: '2026-08'
  };

  assert.equal(shouldShowRecurringReminder(task, new Date('2026-08-26T12:00:00+08:00')), false);
  assert.equal(shouldShowRecurringReminder(task, new Date('2026-08-27T12:00:00+08:00')), true);
});

test('matching a clear fixed-expense transaction finds its payment task', () => {
  const matches = findPaymentTaskMatches(
    { type: 'expense', title: '本月房租', amount: 8500, category: '固定支出' },
    [
      { id: 'rent', kind: 'payment', title: '房租住宿', amount: 8500, enabled: true },
      { id: 'phone', kind: 'payment', title: '手機費', amount: 8500, enabled: true }
    ],
    new Date('2026-08-19T12:00:00+08:00')
  );

  assert.deepEqual(matches.map((item) => item.id), ['rent']);
});
