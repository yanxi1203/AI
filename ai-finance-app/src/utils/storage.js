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


const AUTH_USER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createUserStorage(userId, { storage = globalThis.localStorage } = {}) {
  if (!AUTH_USER_ID_PATTERN.test(userId || '')) throw new TypeError('userId 必須是有效的 UUID');
  if (!storage) throw new TypeError('storage 為必填');

  const prefix = `finmate:user:${userId}:`;
  const key = (name) => prefix + name;
  const readArray = (name) => {
    const raw = storage.getItem(key(name));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  const writeJson = (name, value) => storage.setItem(key(name), JSON.stringify(value));

  return {
    getTheme: () => storage.getItem(key('theme')) || 'system',
    setTheme: (theme) => storage.setItem(key('theme'), theme),
    getBudget: () => {
      const value = Number(storage.getItem(key('monthly_budget')));
      return Number.isFinite(value) && value >= 0 ? value : 0;
    },
    setBudget: (budget) => storage.setItem(key('monthly_budget'), budget),
    getSettings: () => {
      const raw = storage.getItem(key('settings'));
      if (!raw) return normalizeSettings();
      try {
        return normalizeSettings(JSON.parse(raw));
      } catch {
        return normalizeSettings();
      }
    },
    setSettings: (settings) => writeJson('settings', settings),
    getOnboardingCompleted: () => storage.getItem(key('onboarding_complete')) === 'true',
    setOnboardingCompleted: (completed) => storage.setItem(key('onboarding_complete'), String(completed)),
    getTransactions: () => readArray('transactions').filter((item) => !LEGACY_DEMO_TRANSACTION_IDS.has(item?.id)),
    setTransactions: (transactions) => writeJson('transactions', transactions),
    getGoals: () => readArray('dream_goals').filter((item) => !LEGACY_DEMO_GOAL_IDS.has(item?.id)),
    setGoals: (goals) => writeJson('dream_goals', goals),
    getRecurring: () => readArray('recurring')
      .filter((item) => !LEGACY_DEMO_RECURRING_IDS.has(item?.id))
      .map((item) => ({
        ...item,
        kind: item.kind || (item.dueDay ? 'payment' : 'template'),
        isFixedExpense: item.isFixedExpense === true || Boolean(item.dueDay),
        enabled: item.enabled !== false
      })),
    setRecurring: (items) => writeJson('recurring', items),
    getBarcode: () => storage.getItem(key('einvoice')) || '',
    setBarcode: (barcode) => storage.setItem(key('einvoice'), barcode),
    clear: () => {
      const keys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const storedKey = storage.key(index);
        if (storedKey?.startsWith(prefix)) keys.push(storedKey);
      }
      keys.forEach((storedKey) => storage.removeItem(storedKey));
    }
  };
}

export const clearStoredAppData = () => {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
};
