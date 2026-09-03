import {
  COST_OPTION_LABELS,
  ESTIMATE_DISCLAIMER,
  GOAL_ESTIMATE_UPDATED_AT
} from '../../data/goalEstimateReferences.js';

const roundHundred = (value) => Math.round(value / 100) * 100;
const OPTION_MULTIPLIERS = { economy: 1, balanced: 1.08, comfortable: 1.18 };

function normalizeAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function buildComponentEstimate({ goalType, title, items, requiredMessage }) {
  const breakdown = items
    .map((item) => ({ ...item, amount: normalizeAmount(item.amount) }))
    .filter(({ amount }) => amount > 0)
    .map(({ id, label, amount }) => ({
      id,
      label,
      minAmount: roundHundred(amount),
      maxAmount: roundHundred(amount),
      recommendedAmount: roundHundred(amount)
    }));

  if (!breakdown.length) throw new TypeError(requiredMessage);
  const baseAmount = breakdown.reduce((total, item) => total + item.recommendedAmount, 0);

  return {
    goalType,
    title: String(title || '').trim(),
    currency: 'TWD',
    options: Object.entries(OPTION_MULTIPLIERS).map(([id, multiplier]) => {
      const recommendedAmount = roundHundred(baseAmount * multiplier);
      return {
        id,
        label: COST_OPTION_LABELS[id],
        minAmount: roundHundred(recommendedAmount * 0.95),
        maxAmount: roundHundred(recommendedAmount * 1.08),
        recommendedAmount
      };
    }),
    breakdown,
    source: {
      type: 'internal_reference',
      updatedAt: GOAL_ESTIMATE_UPDATED_AT,
      disclaimer: ESTIMATE_DISCLAIMER
    }
  };
}
