import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changeGoalStatus,
  createGoalPlans,
  estimateGoalAmount,
  getGoalStatus,
  groupGoalsByStatus,
  updateGoalRecord
} from './goalPlanner.js';

test('estimates a travel goal without presenting it as live market data', () => {
  const estimate = estimateGoalAmount('去英國看雪');
  assert.equal(estimate.category, '旅行');
  assert.equal(estimate.amount, 100000);
  assert.equal(estimate.source, '前端示範參考值');
});

test('creates comfortable, balanced and accelerated saving choices', () => {
  const plans = createGoalPlans({
    targetAmount: 50000,
    savedAmount: 6000,
    preferredMonths: 12,
    now: new Date('2026-08-20T00:00:00+08:00')
  });

  assert.deepEqual(plans.map((plan) => plan.id), ['comfortable', 'balanced', 'accelerated']);
  assert.deepEqual(plans.map((plan) => plan.months), [18, 12, 8]);
  assert.deepEqual(plans.map((plan) => plan.monthlyContribution), [2500, 3700, 5500]);
});

test('updates an existing goal without changing its identity', () => {
  const updated = updateGoalRecord({
    id: 'goal_1',
    title: '英國旅行',
    targetAmount: 100000,
    savedAmount: 6000,
    category: '旅行'
  }, {
    title: ' 英國看雪之旅 ',
    targetAmount: '120000',
    savedAmount: '8000',
    planMonths: 18
  });

  assert.equal(updated.id, 'goal_1');
  assert.equal(updated.title, '英國看雪之旅');
  assert.equal(updated.targetAmount, 120000);
  assert.equal(updated.savedAmount, 8000);
  assert.equal(updated.planMonths, 18);
  assert.equal(updated.category, '旅行');
  assert.equal(updated.status, 'active');
});

test('treats goals without a status as active and keeps inactive goals out of progress', () => {
  const goals = [
    { id: 'legacy', title: '舊目標' },
    { id: 'done', title: '完成目標', status: 'completed' },
    { id: 'hidden', title: '封存目標', status: 'archived' }
  ];

  assert.equal(getGoalStatus(goals[0]), 'active');
  assert.deepEqual(groupGoalsByStatus(goals), {
    active: [goals[0]],
    completed: [goals[1]],
    archived: [goals[2]]
  });
});

test('completes, archives and restores a goal without losing its savings data', () => {
  const goal = { id: 'goal_1', title: '新電腦', targetAmount: 45000, savedAmount: 8000 };
  const completed = changeGoalStatus(goal, 'completed', new Date('2026-08-26T10:00:00.000Z'));
  const archived = changeGoalStatus(goal, 'archived', new Date('2026-08-27T10:00:00.000Z'));
  const restored = changeGoalStatus(completed, 'active', new Date('2026-08-28T10:00:00.000Z'));

  assert.equal(completed.status, 'completed');
  assert.equal(completed.completedAt, '2026-08-26T10:00:00.000Z');
  assert.equal(archived.status, 'archived');
  assert.equal(archived.archivedAt, '2026-08-27T10:00:00.000Z');
  assert.equal(restored.status, 'active');
  assert.equal(restored.savedAmount, 8000);
  assert.equal('completedAt' in restored, false);
  assert.equal('archivedAt' in restored, false);
});

test('rejects unsupported goal lifecycle states', () => {
  assert.throws(
    () => changeGoalStatus({ id: 'goal_1' }, 'deleted'),
    /不支援的夢想目標狀態/
  );
});
