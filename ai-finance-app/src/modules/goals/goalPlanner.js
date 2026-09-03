const roundUpHundred = (value) => Math.ceil(value / 100) * 100;
const GOAL_STATUSES = new Set(['active', 'completed', 'archived']);
const GOAL_TYPE_PATTERNS = [
  ['travel', /(旅行|旅遊|出國|去.+(?:玩|看雪|自由行)|日本|英國|歐洲|韓國)/i],
  ['product', /(電腦|筆電|桌機|手機|相機|平板|遊戲主機|switch|ps5|xbox)/i],
  ['event', /(演唱會|音樂祭|見面會|活動門票|展覽)/i],
  ['education', /(課程|證照|進修|補習|學習計畫)/i]
];

const CHINESE_DIGITS = { 零: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CHINESE_UNITS = { 十: 10, 百: 100, 千: 1000, 萬: 10000 };

function parseChineseInteger(text) {
  let total = 0;
  let section = 0;
  let number = 0;
  for (const character of text) {
    if (Object.hasOwn(CHINESE_DIGITS, character)) {
      number = CHINESE_DIGITS[character];
      continue;
    }
    const unit = CHINESE_UNITS[character];
    if (!unit) return 0;
    if (unit === 10000) {
      total += (section + number) * unit;
      section = 0;
      number = 0;
    } else {
      section += (number || 1) * unit;
      number = 0;
    }
  }
  return total + section + number;
}

export function parseGoalAmount(value) {
  const text = String(value || '').trim().replace(/,/g, '');
  if (!text) return 0;
  const tenThousand = text.match(/(\d+(?:\.\d+)?)\s*萬/);
  if (tenThousand) return Math.round(Number(tenThousand[1]) * 10000);
  const digits = text.match(/\d+/);
  if (digits) return Number(digits[0]);
  const chinese = text.match(/[零一二兩三四五六七八九十百千萬]+/);
  return chinese ? parseChineseInteger(chinese[0]) : 0;
}

export function detectGoalType(title) {
  const text = String(title || '').trim();
  return GOAL_TYPE_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] || null;
}

export function getGoalAmountRoute({ amountMode, amountInput, title }) {
  if (amountMode === 'known') return parseGoalAmount(amountInput) > 0 ? 'savings' : 'amount';
  if (amountMode === 'estimate') return detectGoalType(title) ? 'requirements' : 'type';
  return 'amount';
}

export function getGoalStatus(goal) {
  return GOAL_STATUSES.has(goal?.status) ? goal.status : 'active';
}

export function groupGoalsByStatus(goals = []) {
  return goals.reduce((groups, goal) => {
    const status = getGoalStatus(goal);
    if (status === 'active') groups.active.push(goal);
    if (status === 'completed') groups.completed.push(goal);
    if (status === 'archived') groups.archived.push(goal);
    return groups;
  }, { active: [], completed: [], archived: [] });
}

export function changeGoalStatus(goal, nextStatus, now = new Date()) {
  if (!goal?.id) throw new TypeError('要調整狀態的夢想目標必須有 id');
  if (!GOAL_STATUSES.has(nextStatus)) throw new TypeError('不支援的夢想目標狀態');

  const changedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  if (nextStatus === 'active') {
    const { completedAt: _completedAt, archivedAt: _archivedAt, ...activeGoal } = goal;
    return { ...activeGoal, status: 'active', updatedAt: changedAt };
  }

  return {
    ...goal,
    status: nextStatus,
    completedAt: nextStatus === 'completed' ? changedAt : null,
    archivedAt: nextStatus === 'archived' ? changedAt : null,
    updatedAt: changedAt
  };
}

export function createGoalPlans({ targetAmount, savedAmount = 0, preferredMonths = 12, now = new Date() }) {
  const remaining = Math.max(0, Number(targetAmount || 0) - Number(savedAmount || 0));
  const balancedMonths = Math.max(3, Math.round(Number(preferredMonths || 12)));
  const definitions = [
    { id: 'comfortable', label: '舒適', months: balancedMonths + 6 },
    { id: 'balanced', label: '平衡', months: balancedMonths },
    { id: 'accelerated', label: '加速', months: Math.max(3, Math.round(balancedMonths * 0.7)) }
  ];

  return definitions.map((definition) => {
    const targetDate = new Date(now);
    targetDate.setMonth(targetDate.getMonth() + definition.months);
    return {
      ...definition,
      monthlyContribution: remaining ? roundUpHundred(remaining / definition.months) : 0,
      targetDate: targetDate.toISOString().slice(0, 10)
    };
  });
}

export function createConfirmedGoal({ confirmed = false, draft, savingsPlan, now = new Date(), id } = {}) {
  if (!confirmed) return null;
  const title = String(draft?.title || '').trim();
  const targetAmount = parseGoalAmount(draft?.targetAmount);
  if (!title) throw new TypeError('夢想目標名稱不能留空');
  if (targetAmount <= 0) throw new TypeError('目標金額必須大於 0');
  if (!savingsPlan?.id) throw new TypeError('請先選擇儲蓄速度方案');

  const timestamp = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const estimation = draft.estimation ? {
    optionId: draft.estimation.optionId || null,
    minAmount: Number(draft.estimation.minAmount || 0),
    maxAmount: Number(draft.estimation.maxAmount || 0),
    recommendedAmount: Number(draft.estimation.recommendedAmount || targetAmount),
    sourceType: draft.estimation.sourceType || 'internal_reference',
    updatedAt: draft.estimation.updatedAt || null
  } : undefined;

  return {
    id: id || `goal_${Date.now()}`,
    type: draft.type || 'custom',
    category: draft.category || draft.type || 'custom',
    title,
    targetAmount,
    savedAmount: Math.max(0, Number(draft.savedAmount || 0)),
    planId: savingsPlan.id,
    planMonths: Number(savingsPlan.months || 0),
    monthlyContribution: Number(savingsPlan.monthlyContribution || 0),
    targetDate: savingsPlan.targetDate || null,
    requirements: draft.requirements || {},
    ...(estimation ? { estimation } : {}),
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function updateGoalRecord(goal, changes) {
  if (!goal?.id) throw new TypeError('要修改的夢想目標必須有 id');

  const title = String(changes?.title ?? goal.title ?? '').trim();
  const targetAmount = Number(changes?.targetAmount ?? goal.targetAmount ?? 0);
  const savedAmount = Number(changes?.savedAmount ?? goal.savedAmount ?? 0);

  if (!title) throw new TypeError('夢想目標名稱不能留空');
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) throw new TypeError('目標金額必須大於 0');
  if (!Number.isFinite(savedAmount) || savedAmount < 0) throw new TypeError('已存金額不能小於 0');

  return {
    ...goal,
    ...changes,
    id: goal.id,
    title,
    targetAmount,
    savedAmount,
    status: getGoalStatus({ ...goal, ...changes })
  };
}
