import { getDaysInMonth, getLocalDateKey, getLocalDay, getMonthKey, getPreviousMonthKey } from '../../utils/date.js';
import { isReservedTransaction } from './monthlyPlan.js';

function safeTransactions(transactions) {
  return Array.isArray(transactions) ? transactions : [];
}

function sum(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
}

function groupExpenses(transactions) {
  return transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((groups, transaction) => {
      const category = transaction.category || '其他';
      groups[category] = (groups[category] || 0) + Number(transaction.amount || 0);
      return groups;
    }, {});
}

/**
 * Project the finance data for one calendar month.
 *
 * Keeping this calculation outside the page means every ledger view (summary,
 * calendar, stream and CSV export) can consume the exact same month boundary.
 */
export function createMonthFinanceSummary({ transactions, monthlyBudget, paymentTasks = [], monthKey }) {
  const source = safeTransactions(transactions);
  const normalizedMonthKey = typeof monthKey === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)
    ? monthKey
    : '';
  const monthTransactions = normalizedMonthKey
    ? source.filter((transaction) => transaction.date?.startsWith(normalizedMonthKey))
    : [];
  const expenses = sum(monthTransactions, 'expense');
  const income = sum(monthTransactions, 'income');
  const reservedExpenses = monthTransactions
    .filter((transaction) => isReservedTransaction(transaction, paymentTasks))
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  const flexibleExpenses = Math.max(0, expenses - reservedExpenses);
  const budget = Math.max(0, Number(monthlyBudget || 0));

  return {
    monthKey: normalizedMonthKey,
    transactions: monthTransactions,
    expenses,
    income,
    reservedExpenses,
    flexibleExpenses,
    monthlyBudget: budget,
    remaining: budget - flexibleExpenses,
    categories: groupExpenses(monthTransactions)
  };
}

export function createFinanceSummary({ transactions, monthlyBudget, paymentTasks = [], now = new Date() }) {
  const source = safeTransactions(transactions);
  const currentMonthKey = getMonthKey(now);
  const previousMonthKey = getPreviousMonthKey(now);
  const todayKey = getLocalDateKey(now);
  const currentMonthSummary = createMonthFinanceSummary({
    transactions: source,
    monthlyBudget,
    paymentTasks,
    monthKey: currentMonthKey
  });
  const previousMonthSummary = createMonthFinanceSummary({
    transactions: source,
    monthlyBudget,
    paymentTasks,
    monthKey: previousMonthKey
  });
  const currentMonth = currentMonthSummary.transactions;
  const previousMonth = previousMonthSummary.transactions;
  const currentDay = getLocalDay(now);
  const previousComparable = previousMonth.filter((transaction) => Number(transaction.date?.slice(-2)) <= currentDay);
  const today = currentMonth.filter((transaction) => transaction.date === todayKey);
  const currentExpenses = currentMonthSummary.expenses;
  const previousExpenses = previousMonthSummary.expenses;
  const previousComparableExpenses = sum(previousComparable, 'expense');
  const currentIncome = currentMonthSummary.income;
  const todayExpenses = sum(today, 'expense');
  const reservedExpenses = currentMonthSummary.reservedExpenses;
  const flexibleExpenses = currentMonthSummary.flexibleExpenses;
  const budget = currentMonthSummary.monthlyBudget;
  const monthRemaining = currentMonthSummary.remaining;
  const lastDay = getDaysInMonth(now);
  const remainingDays = Math.max(1, lastDay - currentDay + 1);
  const percentChange = previousComparableExpenses > 0
    ? Math.round(((currentExpenses - previousComparableExpenses) / previousComparableExpenses) * 100)
    : null;

  return {
    currentMonthKey,
    previousMonthKey,
    todayKey,
    currentMonth,
    previousMonth,
    previousComparable,
    today,
    currentExpenses,
    previousExpenses,
    previousComparableExpenses,
    currentIncome,
    todayExpenses,
    reservedExpenses,
    flexibleExpenses,
    monthlyBudget: budget,
    monthRemaining,
    remainingDays,
    todayAvailable: Math.max(0, monthRemaining / remainingDays),
    percentChange,
    currentCategories: currentMonthSummary.categories,
    previousCategories: previousMonthSummary.categories,
    previousComparableCategories: groupExpenses(previousComparable),
    paymentTasks: Array.isArray(paymentTasks) ? paymentTasks : [],
    recentTransactions: [...source]
      .sort((a, b) => `${b.date || ''}${b.createdAt || ''}`.localeCompare(`${a.date || ''}${a.createdAt || ''}`))
  };
}
