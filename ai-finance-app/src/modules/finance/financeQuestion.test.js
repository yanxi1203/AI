import test from 'node:test';
import assert from 'node:assert/strict';
import { answerFinanceQuestion } from './financeQuestion.js';
import { processFinanceMessage } from '../transactions/transactionAssistant.js';

const baseContext = {
  summary: {
    todayAvailable: 520,
    todayExpenses: 180,
    currentExpenses: 1039,
    currentCategories: { 飲食: 650, 交通: 389 },
    currentMonth: [{ id: 'tx-1' }]
  },
  allocationStatus: 'ready',
  monthlySavingCapacity: 4000,
  recurring: [],
  goals: [],
  now: new Date('2026-09-08T12:00:00+08:00')
};

test('answers today available money and a spending decision from the supplied summary', () => {
  const available = answerFinanceQuestion('我今天還能花多少？', baseContext);
  assert.equal(available.type, 'today_available');
  assert.equal(available.reply, '你今天目前還有 $520 可用。');

  const decision = answerFinanceQuestion('我今天可以花 300 元嗎？', baseContext);
  assert.equal(decision.type, 'spending_check');
  assert.equal(decision.reply, '可以。你今天目前還有 $520 可用；如果花 $300，會剩下約 $220。');
});


test('answers current-month spending and the largest real expense category', () => {
  const total = answerFinanceQuestion('我這個月花了多少？', baseContext);
  assert.equal(total.type, 'monthly_spending');
  assert.equal(total.reply, '你這個月目前支出 $1,039。');

  const largest = answerFinanceQuestion('這個月哪一類支出最多？', baseContext);
  assert.equal(largest.type, 'largest_category');
  assert.equal(largest.reply, '這個月支出最多的是「飲食」，共 $650。');

  const chipQuestion = answerFinanceQuestion('這個月錢都花去哪了？', baseContext);
  assert.equal(chipQuestion.type, 'largest_category');
  assert.equal(chipQuestion.reply, '這個月支出最多的是「飲食」，共 $650。');
});


test('answers the next and remaining fixed expenses using the existing recurring data', () => {
  const context = {
    ...baseContext,
    recurring: [
      { id: 'rent', title: '房租', amount: 8500, dueDay: 10, kind: 'payment', enabled: true },
      { id: 'phone', title: '手機費', amount: 499, dueDay: 15, kind: 'payment', enabled: true },
      { id: 'paid', title: '網路費', amount: 399, dueDay: 5, kind: 'payment', enabled: true, lastCompletedCycle: '2026-09' }
    ]
  };

  const next = answerFinanceQuestion('下一筆固定支出是什麼？', context);
  assert.equal(next.type, 'next_fixed_expense');
  assert.equal(next.reply, '下一筆固定支出是「房租」$8,500，還有 2 天到期。');

  const chipQuestion = answerFinanceQuestion('下一筆要付什麼？', context);
  assert.equal(chipQuestion.type, 'next_fixed_expense');
  assert.equal(chipQuestion.reply, '下一筆固定支出是「房租」$8,500，還有 2 天到期。');

  const remaining = answerFinanceQuestion('這個月還有哪些固定支出？', context);
  assert.equal(remaining.type, 'remaining_fixed_expenses');
  assert.equal(remaining.reply, '這個月尚未完成的固定支出有：「房租」$8,500、「手機費」$499。');
});

test('answers an existing dream progress and reuses its monthly saving recommendation', () => {
  const context = {
    ...baseContext,
    goals: [{
      id: 'goal_trip',
      title: '日本旅行',
      targetAmount: 30000,
      savedAmount: 10000,
      targetDate: '2027-01-08',
      status: 'active'
    }]
  };

  const progress = answerFinanceQuestion('日本旅行還差多少？', context);
  assert.equal(progress.type, 'goal_progress');
  assert.equal(progress.reply, '「日本旅行」已存 $10,000，還差 $20,000，完成 33%。');

  const monthly = answerFinanceQuestion('每個月要存多少才能完成？', context);
  assert.equal(monthly.type, 'goal_monthly_saving');
  assert.equal(monthly.reply, '「日本旅行」距離期限約 4 個月，建議每月存 $5,000。每月需要存下的金額稍高，可以考慮延長期限。');
});


test('declines spending above today available money without inventing another budget', () => {
  const result = answerFinanceQuestion('現在買 500 元的東西可以嗎？', {
    ...baseContext,
    summary: { ...baseContext.summary, todayAvailable: 250 }
  });

  assert.equal(result.type, 'spending_check');
  assert.equal(result.reply, '今天可能會有點吃緊。你目前只剩 $250 可用，這筆 $500 會超過今天的可用金額。');
});

test('does not invent missing data and uses a bounded fallback', () => {
  const insufficient = answerFinanceQuestion('我今天還能花多少？', {
    summary: {},
    allocationStatus: 'pending-income',
    recurring: [],
    goals: []
  });
  const unsupported = answerFinanceQuestion('你可以幫我推薦股票嗎？', baseContext);

  assert.equal(insufficient.type, 'insufficient_data');
  assert.equal(insufficient.reply, '目前記錄還不夠，我再陪你多記幾筆，就能幫你看得更清楚。');
  assert.equal(unsupported.type, 'fallback');
  assert.equal(unsupported.reply, '這個我現在還不太會，不過你可以問我今天還能花多少、本月支出、固定支出或夢想進度。');
});

test('only answers from the supplied user context and finance questions remain chat messages', () => {
  const userA = answerFinanceQuestion('我這個月花了多少？', {
    ...baseContext,
    summary: { ...baseContext.summary, currentExpenses: 1200 }
  });
  const userB = answerFinanceQuestion('我這個月花了多少？', {
    ...baseContext,
    summary: { ...baseContext.summary, currentExpenses: 9800 }
  });
  const parsed = processFinanceMessage({
    text: '我今天可以花 300 元嗎？',
    transactions: [{ id: 'existing', title: '午餐', amount: 110, type: 'expense', date: '2026-09-08' }],
    now: baseContext.now
  });

  assert.equal(userA.reply, '你這個月目前支出 $1,200。');
  assert.equal(userB.reply, '你這個月目前支出 $9,800。');
  assert.doesNotMatch(userA.reply, /9,800/);
  assert.equal(parsed.kind, 'chat');
  assert.equal('transactions' in parsed, false);
});


test('understands a natural today-budget wording', () => {
  const result = answerFinanceQuestion('今天還有多少預算？', baseContext);
  assert.equal(result.type, 'today_available');
  assert.equal(result.reply, '你今天目前還有 $520 可用。');
});

test('reports a completed dream without producing a negative remainder', () => {
  const result = answerFinanceQuestion('我的夢想進度如何？', {
    ...baseContext,
    goals: [{
      id: 'goal_done',
      title: '新電腦',
      targetAmount: 30000,
      savedAmount: 32000,
      targetDate: '2026-12-01',
      status: 'completed'
    }]
  });

  assert.equal(result.type, 'goal_progress');
  assert.equal(result.reply, '「新電腦」已存 $32,000，完成 107%。夢想達成！');
});
