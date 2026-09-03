import {
  COST_OPTION_LABELS,
  ESTIMATE_DISCLAIMER,
  GOAL_ESTIMATE_UPDATED_AT,
  PRODUCT_REFERENCES
} from '../../data/goalEstimateReferences.js';

const COST_MULTIPLIERS = { economy: 0.84, balanced: 1, comfortable: 1.24 };
const roundHundred = (value) => Math.round(value / 100) * 100;

function rangeFromRecommended(recommendedAmount) {
  return {
    minAmount: roundHundred(recommendedAmount * 0.9),
    maxAmount: roundHundred(recommendedAmount * 1.12),
    recommendedAmount: roundHundred(recommendedAmount)
  };
}

export function estimateProductGoal({ title, requirements = {} }) {
  const productType = requirements.productType || 'computer';
  const reference = PRODUCT_REFERENCES[productType];
  if (!reference) throw new TypeError('目前沒有這項商品的內建參考資料，請自行填寫目標金額');

  const usage = requirements.usage || 'undecided';
  const base = reference.usageBase[usage] || reference.usageBase.undecided;
  const level = requirements.level || 'balanced';
  const levelMultiplier = reference.levelMultiplier[level];
  if (!levelMultiplier) throw new TypeError('請選擇商品的入門、平衡或高階等級');

  const includeAccessories = requirements.includeAccessories === true;
  const optionIds = ['economy', 'balanced', 'comfortable'];
  const options = optionIds.map((id) => {
    const deviceAmount = roundHundred(base * levelMultiplier * COST_MULTIPLIERS[id]);
    const accessoriesAmount = includeAccessories ? reference.accessoryAmount[id] : 0;
    return {
      id,
      label: COST_OPTION_LABELS[id],
      ...rangeFromRecommended(deviceAmount + accessoriesAmount)
    };
  });
  const selectedOption = options.find(({ id }) => id === 'balanced');
  const accessoryAmount = includeAccessories ? reference.accessoryAmount.balanced : 0;
  const deviceRecommended = selectedOption.recommendedAmount - accessoryAmount;
  const breakdown = [
    { id: 'product', label: '商品本體', ...rangeFromRecommended(deviceRecommended) }
  ];
  if (includeAccessories) {
    breakdown.push({ id: 'accessories', label: '配件', ...rangeFromRecommended(accessoryAmount) });
  }

  return {
    goalType: 'product',
    title: String(title || '').trim(),
    currency: 'TWD',
    options,
    breakdown,
    source: {
      type: 'internal_reference',
      updatedAt: GOAL_ESTIMATE_UPDATED_AT,
      disclaimer: ESTIMATE_DISCLAIMER
    }
  };
}
