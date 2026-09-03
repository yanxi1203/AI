import { buildComponentEstimate } from './componentEstimate.js';

export function estimateCustomGoal({ title, requirements = {} }) {
  return buildComponentEstimate({
    goalType: 'custom',
    title,
    requiredMessage: '目前資料不足以估算，請補充預計費用或自行填寫目標金額',
    items: [
      { id: 'estimated-cost', label: '預計費用', amount: requirements.estimatedCost },
      { id: 'reserve', label: '其他預備金', amount: requirements.reserve }
    ]
  });
}
