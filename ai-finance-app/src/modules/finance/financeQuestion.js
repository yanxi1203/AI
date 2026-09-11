import { getGoalAffordability, getGoalStatus } from '../goals/goalPlanner.js';
import {
  getPaymentDueDistance,
  isPaymentTask,
  isRecurringCompleted,
  shouldShowRecurringReminder
} from './monthlyPlan.js';

const INSUFFICIENT_REPLY = '目前記錄還不夠，我再陪你多記幾筆，就能幫你看得更清楚。';
const FALLBACK_REPLY = '這個我現在還不太會，不過你可以問我今天還能花多少、本月支出、固定支出或夢想進度。';

const money = (value) => Math.round(Number(value || 0)).toLocaleString('zh-TW');

function parseQuestionAmount(text) {
  const match = String(text || '').replace(/,/g, '').match(/(?:^|[^\d])(\d+)\s*(?:元|塊)?/);
  return match ? Number(match[1]) : null;
}

function hasAvailableBudget(context) {
  return context?.allocationStatus === 'ready'
    && Number.isFinite(Number(context?.summary?.todayAvailable));
}


function getOutstandingPayments(context) {
  const now = context?.now || new Date();
  return (Array.isArray(context?.recurring) ? context.recurring : [])
    .filter((item) => item?.enabled !== false && isPaymentTask(item))
    .filter((item) => !isRecurringCompleted(item, now));
}

function dueDescription(days) {
  if (days < 0) return `已逾期 ${Math.abs(days)} 天`;
  if (days === 0) return '今天到期';
  return `還有 ${days} 天到期`;
}

function getAvailableGoals(context) {
  return (Array.isArray(context?.goals) ? context.goals : [])
    .filter((goal) => getGoalStatus(goal) !== 'archived')
    .filter((goal) => Number(goal?.targetAmount) > 0);
}

function selectGoal(text, goals) {
  const named = goals.filter((goal) => goal?.title && text.includes(goal.title));
  if (named.length === 1) return named[0];
  return goals.length === 1 ? goals[0] : null;
}

function goalAffordability(goal, context) {
  return getGoalAffordability(goal, {
    monthlySavingCapacity: context?.monthlySavingCapacity,
    allocationStatus: context?.allocationStatus,
    now: context?.now || new Date()
  });
}

export function answerFinanceQuestion(question, context = {}) {
  const text = String(question || '').trim();
  const requestedAmount = parseQuestionAmount(text);
  const asksSpendingCheck = requestedAmount !== null
    && /(?:可以|能不能|可不可以|適合).*(?:花|買)|(?:花|買).*(?:可以嗎|行嗎)/.test(text);

  if (asksSpendingCheck) {
    if (!hasAvailableBudget(context)) return { type: 'insufficient_data', reply: INSUFFICIENT_REPLY };
    const available = Math.max(0, Number(context.summary.todayAvailable));
    if (requestedAmount <= available) {
      return {
        type: 'spending_check',
        reply: `可以。你今天目前還有 $${money(available)} 可用；如果花 $${money(requestedAmount)}，會剩下約 $${money(available - requestedAmount)}。`
      };
    }
    return {
      type: 'spending_check',
      reply: `今天可能會有點吃緊。你目前只剩 $${money(available)} 可用，這筆 $${money(requestedAmount)} 會超過今天的可用金額。`
    };
  }

  if (/今天.*(?:還能|還有|可以|可用|剩).*(?:花|用|預算|錢)|今天.*(?:花|預算|錢).*(?:多少|剩)/.test(text)) {
    if (!hasAvailableBudget(context)) return { type: 'insufficient_data', reply: INSUFFICIENT_REPLY };
    return {
      type: 'today_available',
      reply: `你今天目前還有 $${money(Math.max(0, context.summary.todayAvailable))} 可用。`
    };
  }

  if (/(?:花最多|哪一類.*最多|最大支出分類|錢都花去哪(?:裡|了)?)/.test(text)) {
    const categories = Object.entries(context?.summary?.currentCategories || {})
      .filter(([, amount]) => Number(amount) > 0)
      .sort((left, right) => Number(right[1]) - Number(left[1]));
    if (!categories.length) {
      return { type: 'insufficient_data', reply: INSUFFICIENT_REPLY };
    }
    const [category, amount] = categories[0];
    return {
      type: 'largest_category',
      reply: `這個月支出最多的是「${category}」，共 $${money(amount)}。`
    };
  }

  if (!/(?:固定支出|帳單)/.test(text) && /(?:這個月|本月).*(?:花了多少|花多少|支出多少|支出)/.test(text)) {
    if (!Number.isFinite(Number(context?.summary?.currentExpenses))) {
      return { type: 'insufficient_data', reply: INSUFFICIENT_REPLY };
    }
    const currentExpenses = Math.max(0, Number(context.summary.currentExpenses));
    return {
      type: 'monthly_spending',
      reply: currentExpenses > 0
        ? `你這個月目前支出 $${money(currentExpenses)}。`
        : '目前本月還沒有支出紀錄。'
    };
  }


  if (/(?:這個月|本月).*(?:還有|尚有|剩).*(?:固定支出|帳單)|(?:固定支出|帳單).*(?:這個月|本月).*(?:還有|尚有|剩)/.test(text)) {
    const payments = getOutstandingPayments(context);
    if (!payments.length) {
      const hasPayments = (context?.recurring || []).some((item) => item?.enabled !== false && isPaymentTask(item));
      return {
        type: 'remaining_fixed_expenses',
        reply: hasPayments ? '這個月的固定支出都已完成。' : '目前還沒有設定固定支出。'
      };
    }
    const details = payments.map((item) => `「${item.title}」$${money(item.amount)}`).join('、');
    return {
      type: 'remaining_fixed_expenses',
      reply: `這個月尚未完成的固定支出有：${details}。`
    };
  }

  if (/(?:下一筆|最近).*(?:固定支出|帳單|要繳|要付)|(?:固定支出|帳單).*(?:下一筆|最近|要繳|要付)/.test(text)) {
    const now = context?.now || new Date();
    const payments = getOutstandingPayments(context)
      .filter((item) => item?.dueDay)
      .map((item) => ({ item, days: getPaymentDueDistance(item, now) }))
      .sort((left, right) => left.days - right.days);
    const upcoming = payments.filter(({ item }) => shouldShowRecurringReminder(item, now));
    const selected = upcoming[0] || payments[0];
    if (!selected) {
      return { type: 'next_fixed_expense', reply: '目前沒有可確認到期日的固定支出。' };
    }
    return {
      type: 'next_fixed_expense',
      reply: `下一筆固定支出是「${selected.item.title}」$${money(selected.item.amount)}，${dueDescription(selected.days)}。`
    };
  }


  const asksGoalMonthly = /(?:每個月|每月).*(?:要存|存多少|存下)|(?:要存|存多少).*(?:每個月|每月)/.test(text);
  const asksGoalProgress = /(?:夢想|目標|旅行|旅遊|電腦|筆電|演唱會).*(?:還差|存到|進度|完成)|(?:還差|存到哪|進度).*(?:夢想|目標)/.test(text);

  if (asksGoalMonthly || asksGoalProgress) {
    const goals = getAvailableGoals(context);
    if (!goals.length) return { type: 'insufficient_data', reply: INSUFFICIENT_REPLY };
    const goal = selectGoal(text, goals);
    if (!goal) {
      const summary = goals.slice(0, 3).map((item) => {
        const result = goalAffordability(item, context);
        return `「${item.title}」還差 $${money(result.remainingAmount)}`;
      }).join('、');
      return {
        type: 'goal_summary',
        reply: `你目前的夢想進度是：${summary}。告訴我夢想名稱，我可以再幫你算每月建議。`
      };
    }

    const result = goalAffordability(goal, context);
    if (asksGoalMonthly) {
      if (result.recommendedMonthly === null || result.remainingMonths === null) {
        return { type: 'insufficient_data', reply: INSUFFICIENT_REPLY };
      }
      return {
        type: 'goal_monthly_saving',
        reply: `「${goal.title}」距離期限約 ${result.remainingMonths} 個月，建議每月存 $${money(result.recommendedMonthly)}。${result.message}`
      };
    }

    return {
      type: 'goal_progress',
      reply: result.completed
        ? `「${goal.title}」已存 $${money(result.savedAmount)}，完成 ${result.percent}%。夢想達成！`
        : `「${goal.title}」已存 $${money(result.savedAmount)}，還差 $${money(result.remainingAmount)}，完成 ${result.percent}%。`
    };
  }

  return { type: 'fallback', reply: FALLBACK_REPLY };
}
