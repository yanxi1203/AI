const ESTIMATE_RULES = [
  { pattern: /(英國|歐洲|出國|旅行|旅遊)/, category: '旅行', amount: 100000, label: '海外旅行' },
  { pattern: /(電腦|筆電|桌機|主機)/, category: '3C', amount: 45000, label: '電腦設備' },
  { pattern: /(手機|平板)/, category: '3C', amount: 30000, label: '行動裝置' },
  { pattern: /(遊戲機|遊戲主機|switch|ps5|xbox)/i, category: '娛樂', amount: 18000, label: '遊戲設備' },
  { pattern: /(演唱會|追星|見面會)/, category: '娛樂', amount: 12000, label: '活動與娛樂' },
  { pattern: /(課程|證照|進修|學習)/, category: '學習', amount: 30000, label: '學習進修' }
];

const roundUpHundred = (value) => Math.ceil(value / 100) * 100;
const GOAL_STATUSES = new Set(['active', 'completed', 'archived']);

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

export function estimateGoalAmount(title) {
  const match = ESTIMATE_RULES.find((rule) => rule.pattern.test(String(title || '')));
  const estimate = match || { category: '自訂', amount: 30000, label: '一般目標' };
  return {
    category: estimate.category,
    amount: estimate.amount,
    label: estimate.label,
    source: '前端示範參考值'
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
