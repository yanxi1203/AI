import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addGoalDeposit,
  changeGoalStatus,
  createConfirmedGoal,
  createGoalPlans,
  detectGoalType,
  getGoalAmountRoute,
  getGoalStatus,
  groupGoalsByStatus,
  getGoalAffordability,
  parseGoalAmount,
  updateGoalRecord
} from './goalPlanner.js';


test('adds a deposit without changing goal identity and completes a fully funded goal', () => {
  const active = { id: 'goal_trip', title: '日本旅行', targetAmount: 30000, savedAmount: 8000, status: 'active' };
  const updated = addGoalDeposit(active, 2000, new Date('2026-09-08T04:00:00.000Z'));
  assert.equal(updated.id, 'goal_trip');
  assert.equal(updated.savedAmount, 10000);
  assert.equal(updated.status, 'active');
  const completed = addGoalDeposit(updated, 25000, new Date('2026-09-09T04:00:00.000Z'));
  assert.equal(completed.savedAmount, 35000);
  assert.equal(completed.status, 'completed');
  assert.equal(completed.completedAt, '2026-09-09T04:00:00.000Z');
  assert.throws(() => addGoalDeposit(active, 0), /存款金額必須大於 0/);
});

test('calculates remaining money, progress and monthly affordability from existing finance data', () => {
  const result = getGoalAffordability({ targetAmount: 30000, savedAmount: 10000, targetDate: '2027-01-08' }, {
    monthlySavingCapacity: 6000, allocationStatus: 'ready', now: new Date('2026-09-08T00:30:00+08:00')
  });
  assert.equal(result.remainingAmount, 20000);
  assert.equal(result.percent, 33);
  assert.equal(result.progressPercent, 33);
  assert.equal(result.remainingMonths, 4);
  assert.equal(result.recommendedMonthly, 5000);
  assert.equal(result.capacityStatus, 'on-track');
  assert.equal(result.message, '照目前狀況，這個目標很有機會完成。');
});

test('does not invent affordability when finance data is insufficient and clamps completed progress', () => {
  const insufficient = getGoalAffordability({ targetAmount: 30000, savedAmount: 8000, targetDate: '2027-01-08' }, {
    monthlySavingCapacity: 0, allocationStatus: 'pending-income', now: new Date('2026-09-08T00:30:00+08:00')
  });
  assert.equal(insufficient.capacityStatus, 'insufficient-data');
  assert.equal(insufficient.message, '目前資料不足，先多記錄一些收支後，FinMate 會更容易幫你評估。');
  const completed = getGoalAffordability({ targetAmount: 30000, savedAmount: 35000, targetDate: '2026-09-08' }, {
    monthlySavingCapacity: 5000, allocationStatus: 'ready'
  });
  assert.equal(completed.remainingAmount, 0);
  assert.equal(completed.percent, 117);
  assert.equal(completed.progressPercent, 100);
  assert.equal(completed.completed, true);
  assert.equal(completed.message, '夢想達成！');
});

test('known goal amounts skip estimation while unknown ambiguous goals ask for a type', () => {
  assert.equal(getGoalAmountRoute({ amountMode: 'known', amountInput: '30,000', title: '新電腦' }), 'savings');
  assert.equal(getGoalAmountRoute({ amountMode: 'estimate', title: '完成一件很重要的事' }), 'type');
  assert.equal(getGoalAmountRoute({ amountMode: 'estimate', title: '我想去日本玩一週' }), 'requirements');
});

test('goal amounts support Arabic and Chinese ten-thousand notation', () => {
  assert.equal(parseGoalAmount('30000'), 30000);
  assert.equal(parseGoalAmount('30,000'), 30000);
  assert.equal(parseGoalAmount('3萬'), 30000);
  assert.equal(parseGoalAmount('三萬'), 30000);
});

test('goal type detection distinguishes supported types and leaves ambiguous text unclassified', () => {
  assert.equal(detectGoalType('我想去日本玩一週'), 'travel');
  assert.equal(detectGoalType('我想買一台設計用電腦'), 'product');
  assert.equal(detectGoalType('我想參加演唱會'), 'event');
  assert.equal(detectGoalType('我想上設計課程'), 'education');
  assert.equal(detectGoalType('完成一件很重要的事'), null);
});

test('a goal record is not created before the user confirms it', () => {
  const input = {
    confirmed: false,
    draft: {
      title: '設計用筆電',
      type: 'product',
      category: 'computer',
      targetAmount: 45000,
      requirements: {},
      estimation: { optionId: 'economy', minAmount: 38000, maxAmount: 50000, recommendedAmount: 45000, sourceType: 'internal_reference', updatedAt: '2026-09-03' }
    },
    savingsPlan: { id: 'balanced', months: 12, monthlyContribution: 3800, targetDate: '2027-09-03' },
    now: new Date('2026-09-03T00:00:00.000Z'),
    id: 'goal_test'
  };

  assert.equal(createConfirmedGoal(input), null);
  const goal = createConfirmedGoal({ ...input, confirmed: true });
  assert.equal(goal.id, 'goal_test');
  assert.equal(goal.targetAmount, 45000);
  assert.equal(goal.planId, 'balanced');
  assert.equal(goal.estimation.optionId, 'economy');
  assert.equal(goal.status, 'active');
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
