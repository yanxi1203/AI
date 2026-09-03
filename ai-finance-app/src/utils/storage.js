// LocalStorage keys & state management
const KEYS = {
  TRANSACTIONS: 'ai_butler_transactions',
  DREAM_GOALS: 'ai_butler_dream_goals',
  RECURRING: 'ai_butler_recurring',
  BUDGET: 'ai_butler_monthly_budget',
  SETTINGS: 'ai_butler_settings',
  ONBOARDING: 'ai_butler_onboarding_complete',
  THEME: 'ai_butler_theme',
  EINVOICE: 'ai_butler_einvoice'
};

const LEGACY_DEMO_TRANSACTION_IDS = new Set([
  'tx_1', 'tx_2', 'tx_3', 'tx_4', 'tx_5', 'tx_6', 'tx_prev_1', 'tx_prev_2'
]);
const LEGACY_DEMO_GOAL_IDS = new Set(['goal_1', 'goal_2']);
const LEGACY_DEMO_RECURRING_IDS = new Set(['rec_1', 'rec_2']);

const readStoredArray = (key) => {
  const data = localStorage.getItem(key);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const DEFAULT_SETTINGS = {
  name: 'Fin',
  tone: 'gentle', // 'gentle' | 'lively' | 'strict'
  strictness: 50,
  useLlmDynamic: true,
  homeSections: {
    reminders: true,
    recentRecords: true,
    goals: true
  },
  notifications: {
    bills: true,
    budget: true,
    dailySummary: false
  },
  display: {
    textSize: 'system'
  },
  automation: {
    billMatching: true,
    exactMatchAction: 'auto'
  },
  categories: ['飲食', '交通', '娛樂', '學習', '固定支出', '日常'],
  privacy: {
    anonymousAnalytics: false
  },
  profile: {
    userName: '',
    incomeType: 'allowance',
    monthlyIncome: 0,
    incomeUnknown: true,
    fixedExpenses: 0,
    fixedTypes: [],
    fixedItems: [],
    desiredSavings: 0
  },
  allocation: {
    status: 'pending-income',
    savings: 0,
    flexible: 0,
    shortfall: 0,
    calculatedAt: null
  }
};

export const getStoredTheme = () => localStorage.getItem(KEYS.THEME) || 'system';
export const setStoredTheme = (theme) => localStorage.setItem(KEYS.THEME, theme);

export const getStoredBudget = () => {
  const stored = localStorage.getItem(KEYS.BUDGET);
  if (stored === null) return 0;
  const budget = Number(stored);
  return Number.isFinite(budget) && budget >= 0 ? budget : 0;
};
export const setStoredBudget = (budget) => localStorage.setItem(KEYS.BUDGET, budget);

export const normalizeSettings = (value) => {
  const parsed = isRecord(value) ? value : {};
  const parsedProfile = isRecord(parsed.profile) ? parsed.profile : {};
  const profile = { ...DEFAULT_SETTINGS.profile, ...parsedProfile };
  profile.incomeUnknown = typeof parsedProfile.incomeUnknown === 'boolean'
    ? parsedProfile.incomeUnknown
    : Number(profile.monthlyIncome || 0) <= 0;
  const parsedAllocation = isRecord(parsed.allocation) ? parsed.allocation : {};
  const allocation = { ...DEFAULT_SETTINGS.allocation, ...parsedAllocation };
  allocation.status = ['ready', 'pending-income'].includes(parsedAllocation.status)
    ? parsedAllocation.status
    : profile.incomeUnknown ? 'pending-income' : 'ready';
  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    homeSections: { ...DEFAULT_SETTINGS.homeSections, ...(isRecord(parsed.homeSections) ? parsed.homeSections : {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(isRecord(parsed.notifications) ? parsed.notifications : {}) },
    display: { ...DEFAULT_SETTINGS.display, ...(isRecord(parsed.display) ? parsed.display : {}) },
    automation: { ...DEFAULT_SETTINGS.automation, ...(isRecord(parsed.automation) ? parsed.automation : {}) },
    privacy: { ...DEFAULT_SETTINGS.privacy, ...(isRecord(parsed.privacy) ? parsed.privacy : {}) },
    profile,
    allocation,
    categories: Array.isArray(parsed.categories) ? parsed.categories : DEFAULT_SETTINGS.categories
  };
};

export const getStoredSettings = () => {
  const data = localStorage.getItem(KEYS.SETTINGS);
  if (!data) return normalizeSettings();
  try {
    return normalizeSettings(JSON.parse(data));
  } catch {
    return normalizeSettings();
  }
};
export const setStoredSettings = (settings) => localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));

export const getStoredOnboardingCompleted = () => localStorage.getItem(KEYS.ONBOARDING) === 'true';
export const setStoredOnboardingCompleted = (completed) => localStorage.setItem(KEYS.ONBOARDING, String(completed));

export const getStoredTransactions = () => {
  const stored = readStoredArray(KEYS.TRANSACTIONS);
  const transactions = stored.filter((item) => !LEGACY_DEMO_TRANSACTION_IDS.has(item?.id));
  if (transactions.length !== stored.length) setStoredTransactions(transactions);
  return transactions;
};
export const setStoredTransactions = (txs) => localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(txs));

export const getStoredGoals = () => {
  const stored = readStoredArray(KEYS.DREAM_GOALS);
  const goals = stored.filter((item) => !LEGACY_DEMO_GOAL_IDS.has(item?.id));
  if (goals.length !== stored.length) setStoredGoals(goals);
  return goals;
};
export const setStoredGoals = (goals) => localStorage.setItem(KEYS.DREAM_GOALS, JSON.stringify(goals));

export const getStoredEInvoiceBarcode = () => {
  const barcode = localStorage.getItem(KEYS.EINVOICE) || '';
  return barcode === '/AB12345' ? '' : barcode;
};
export const setStoredEInvoiceBarcode = (barcode) => localStorage.setItem(KEYS.EINVOICE, barcode);

export const getStoredRecurring = () => {
  const stored = readStoredArray(KEYS.RECURRING);
  const recurring = stored
    .filter((item) => !LEGACY_DEMO_RECURRING_IDS.has(item?.id))
    .map((item) => ({
      ...item,
      kind: item.kind || (item.dueDay ? 'payment' : 'template'),
      isFixedExpense: item.isFixedExpense === true || Boolean(item.dueDay),
      enabled: item.enabled !== false
    }));
  if (recurring.length !== stored.length) setStoredRecurring(recurring);
  return recurring;
};
export const setStoredRecurring = (items) => localStorage.setItem(KEYS.RECURRING, JSON.stringify(items));

export const clearStoredAppData = () => {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
};
