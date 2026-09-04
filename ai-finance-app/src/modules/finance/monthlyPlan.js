import { getLocalDateKey, getLocalDay, getMonthKey } from '../../utils/date.js';

const positiveNumber = (value) => Math.max(0, Number(value || 0));
const PAYMENT_KEYWORDS = ['房租', '水費', '電費', '瓦斯', '網路', '手機', '電信', '學費', '管理費', '訂閱', '保險', '信用卡'];

export function isPaymentTask(item) {
  return item?.kind === 'payment' || item?.isFixedExpense === true || Boolean(item?.dueDay);
}

export function createPaymentTask({ id, title, amount, dueDay = null, category = '固定支出' }) {
  const normalizedTitle = String(title || '').trim();
  const normalizedAmount = Number(amount);
  const hasDueDay = dueDay !== '' && dueDay != null;
  const normalizedDueDay = hasDueDay ? Math.min(31, Math.max(1, Number(dueDay))) : null;

  if (!normalizedTitle) throw new TypeError('固定支出名稱不能留空');
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) throw new TypeError('固定支出金額必須大於 0');
  if (hasDueDay && !Number.isFinite(normalizedDueDay)) throw new TypeError('繳費日格式不正確');

  return {
    id: id || `payment_${Date.now()}`,
    title: normalizedTitle,
    amount: normalizedAmount,
    category,
    frequency: 'monthly',
    dueDay: normalizedDueDay,
    kind: 'payment',
    isFixedExpense: true,
    enabled: true
  };
}

export function getRecurringCycleKey(item, now = new Date()) {
  return isPaymentTask(item) && item?.frequency !== 'daily'
    ? getMonthKey(now)
    : getLocalDateKey(now);
}

export function isRecurringCompleted(item, now = new Date()) {
  const cycleKey = getRecurringCycleKey(item, now);
  if (item?.lastCompletedCycle === cycleKey) return true;
  if (!item?.lastCompletedDate) return false;
  return isPaymentTask(item)
    ? item.lastCompletedDate.startsWith(cycleKey)
    : item.lastCompletedDate === cycleKey;
}

export function shouldShowRecurringReminder(item, now = new Date()) {
  if (!item || item.enabled === false || isRecurringCompleted(item, now)) return false;
  if (item.skippedOn === getLocalDateKey(now)) return false;
  if (!isPaymentTask(item)) return true;
  if (!item.dueDay) return false;
  const reminderStartDay = Math.max(1, Number(item.dueDay) - 5);
  return getLocalDay(now) >= reminderStartDay;
}

function normalizedMatchText(value) {
  return String(value || '').replace(/\s+/g, '').replace(/(固定支出|繳費|帳單|費用)/g, '');
}

export function findPaymentTaskMatches(transaction, paymentTasks = [], now = new Date()) {
  if (!transaction || transaction.type !== 'expense' || Number(transaction.amount) <= 0) return [];
  const title = normalizedMatchText(transaction.title);
  const transactionKeywords = PAYMENT_KEYWORDS.filter((keyword) => title.includes(keyword));
  const amountMatches = paymentTasks.filter((item) =>
    isPaymentTask(item)
    && item.enabled !== false
    && !isRecurringCompleted(item, now)
    && Number(item.amount) === Number(transaction.amount)
  );

  const confident = amountMatches.filter((item) => {
    const itemTitle = normalizedMatchText(item.title);
    const exactOrContained = title && itemTitle && (title.includes(itemTitle) || itemTitle.includes(title));
    const sharesKeyword = transactionKeywords.some((keyword) => itemTitle.includes(keyword));
    return exactOrContained || sharesKeyword;
  });

  if (confident.length) return confident;
  if (amountMatches.length === 1 && transaction.category === '固定支出') return amountMatches;
  return [];
}

export function createMonthlyPlan({
  incomeAmount = 0,
  incomeKnown = true,
  fixedItems = [],
  desiredSavings = 0
} = {}) {
  const income = positiveNumber(incomeAmount);
  const normalizedFixedItems = (Array.isArray(fixedItems) ? fixedItems : [])
    .filter((item) => item && positiveNumber(item.amount) > 0)
    .map((item) => ({ ...item, amount: positiveNumber(item.amount) }));
  const fixedReserved = normalizedFixedItems.reduce((total, item) => total + item.amount, 0);
  const hasKnownIncome = incomeKnown !== false;
  const shortfall = hasKnownIncome ? Math.max(0, fixedReserved - income) : null;
  const afterFixed = Math.max(0, income - fixedReserved);
  const requestedSavings = positiveNumber(desiredSavings);
  const plannedSavings = hasKnownIncome
    ? requestedSavings
      ? Math.min(requestedSavings, afterFixed)
      : Math.round((afterFixed * 0.2) / 100) * 100
    : 0;

  return {
    incomeAmount: income,
    incomeKnown: hasKnownIncome,
    fixedItems: normalizedFixedItems,
    fixedReserved,
    shortfall,
    requestedSavings,
    plannedSavings,
    flexibleBudget: hasKnownIncome ? Math.max(0, afterFixed - plannedSavings) : 0,
    status: hasKnownIncome ? 'ready' : 'pending-income'
  };
}

/**
 * Builds the one financial setup shape shared by onboarding and Settings.
 * Pages only need to merge profile/allocation into the user's other settings.
 */
export function createFinancialSetup({
  incomeAmount = 0,
  incomeKnown = true,
  fixedItems = [],
  desiredSavings = 0,
  now = new Date()
} = {}) {
  const plan = createMonthlyPlan({ incomeAmount, incomeKnown, fixedItems, desiredSavings });
  const calculatedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();

  return {
    monthlyBudget: plan.flexibleBudget,
    profile: {
      monthlyIncome: plan.incomeAmount,
      incomeUnknown: !plan.incomeKnown,
      fixedExpenses: plan.fixedReserved,
      fixedTypes: [...new Set(plan.fixedItems.map((item) => item.type || '固定支出'))],
      fixedItems: plan.fixedItems,
      desiredSavings: plan.requestedSavings > 0 ? plan.requestedSavings : plan.plannedSavings
    },
    allocation: {
      status: plan.status,
      savings: plan.plannedSavings,
      flexible: plan.flexibleBudget,
      shortfall: plan.shortfall,
      calculatedAt
    }
  };
}

export function validateFixedItems(fixedItems = []) {
  const invalidItems = (Array.isArray(fixedItems) ? fixedItems : [])
    .filter((item) => item && (!Number.isFinite(Number(item.amount)) || Number(item.amount) <= 0));

  return {
    isValid: invalidItems.length === 0,
    invalidIds: invalidItems.map((item) => item.id),
    invalidCount: invalidItems.length
  };
}

export function syncFixedItemsToPaymentTasks(fixedItems, currentItems = []) {
  const safeCurrent = Array.isArray(currentItems) ? currentItems : [];
  const existingByFixedId = new Map(
    safeCurrent
      .filter(isPaymentTask)
      .map((item) => [item.planFixedItemId || item.id, item])
  );
  const unmanaged = safeCurrent.filter((item) => !isPaymentTask(item));
  const managed = (Array.isArray(fixedItems) ? fixedItems : [])
    .filter((item) => item && positiveNumber(item.amount) > 0)
    .map((item) => {
      const existing = existingByFixedId.get(item.id) || {};
      return {
        ...existing,
        id: existing.id || `payment_${item.id}`,
        planFixedItemId: item.id,
        title: item.title || item.type || '固定支出',
        amount: positiveNumber(item.amount),
        category: item.type?.includes('交通') ? '交通' : '固定支出',
        frequency: 'monthly',
        dueDay: existing.dueDay || null,
        kind: 'payment',
        isFixedExpense: true,
        enabled: existing.enabled !== false
      };
    });

  return [...unmanaged, ...managed];
}

export function isReservedTransaction(transaction, paymentTasks = []) {
  if (!transaction || transaction.type !== 'expense') return false;
  if (transaction.isFixedExpense === true) return true;
  const tasks = (Array.isArray(paymentTasks) ? paymentTasks : []).filter(isPaymentTask);
  if (transaction.recurringId && tasks.some((item) => item.id === transaction.recurringId)) return true;
  return tasks.some((item) => item.title && item.title === transaction.title);
}
