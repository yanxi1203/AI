import {
  COST_OPTION_LABELS,
  ESTIMATE_DISCLAIMER,
  GOAL_ESTIMATE_UPDATED_AT,
  TRAVEL_REFERENCES
} from '../../data/goalEstimateReferences.js';

const roundHundred = (value) => Math.round(value / 100) * 100;

function requirePositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) throw new TypeError(`${label}必須大於 0`);
  return number;
}

function destinationReference(destination) {
  const text = String(destination || '').trim();
  if (!text) throw new TypeError('請先提供旅行目的地');
  const reference = Object.values(TRAVEL_REFERENCES).find(({ match }) => match.test(text));
  if (!reference) throw new TypeError('目前沒有這個目的地的內建參考資料，請補充預算或自行填寫目標金額');
  return reference;
}

function amountRange(values, multiplier = 1, divisor = 1) {
  const [min, max, recommended] = values;
  return {
    minAmount: roundHundred((min * multiplier) / divisor),
    maxAmount: roundHundred((max * multiplier) / divisor),
    recommendedAmount: roundHundred((recommended * multiplier) / divisor)
  };
}

function buildBreakdown(reference, optionId, { travelers, days, nights, includeShopping }) {
  const option = reference.options[optionId];
  const items = [
    { id: 'transport', label: '往返交通', ...amountRange(option.transport) },
    {
      id: 'accommodation',
      label: '住宿',
      ...amountRange(option.accommodationPerRoomNight, nights, travelers),
      note: `${nights} 晚、${travelers} 人分攤`
    },
    { id: 'daily', label: '餐飲與當地交通', ...amountRange(option.dailyPerPerson, days) },
    { id: 'reserve', label: '預備金', ...amountRange(option.reserve) }
  ];
  if (includeShopping) items.splice(3, 0, { id: 'shopping', label: '購物預算', ...amountRange(option.shopping) });
  return items;
}

function sumBreakdown(items, key) {
  return roundHundred(items.reduce((total, item) => total + item[key], 0));
}

export function estimateTravelGoal({ title, requirements = {} }) {
  const destination = String(requirements.destination || '').trim();
  const travelers = requirePositiveInteger(requirements.travelers, '旅行人數');
  const days = requirePositiveInteger(requirements.days, '旅行天數');
  const nights = requirePositiveInteger(requirements.nights, '住宿晚數');
  const reference = destinationReference(destination);
  const optionIds = ['economy', 'balanced', 'comfortable'];
  const breakdownByOption = Object.fromEntries(optionIds.map((id) => [id, buildBreakdown(reference, id, {
    travelers,
    days,
    nights,
    includeShopping: requirements.includeShopping === true
  })]));
  const selectedStyle = optionIds.includes(requirements.style) ? requirements.style : 'balanced';

  return {
    goalType: 'travel',
    title: String(title || destination).trim(),
    currency: 'TWD',
    options: optionIds.map((id) => ({
      id,
      label: COST_OPTION_LABELS[id],
      minAmount: sumBreakdown(breakdownByOption[id], 'minAmount'),
      maxAmount: sumBreakdown(breakdownByOption[id], 'maxAmount'),
      recommendedAmount: sumBreakdown(breakdownByOption[id], 'recommendedAmount')
    })),
    breakdown: breakdownByOption[selectedStyle],
    source: {
      type: 'internal_reference',
      updatedAt: GOAL_ESTIMATE_UPDATED_AT,
      disclaimer: ESTIMATE_DISCLAIMER
    }
  };
}
