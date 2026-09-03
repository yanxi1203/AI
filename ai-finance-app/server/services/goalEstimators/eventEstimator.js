import { buildComponentEstimate } from './componentEstimate.js';

export function estimateEventGoal({ title, requirements = {} }) {
  if (Number(requirements.ticketPrice || 0) <= 0) {
    throw new TypeError('請先提供活動票價，或自行填寫目標金額');
  }
  return buildComponentEstimate({
    goalType: 'event',
    title,
    requiredMessage: '請補充活動費用，或自行填寫目標金額',
    items: [
      { id: 'ticket', label: '票價', amount: requirements.ticketPrice },
      { id: 'transport', label: '交通', amount: requirements.transport },
      { id: 'accommodation', label: '住宿', amount: requirements.accommodation },
      { id: 'reserve', label: '其他預備金', amount: requirements.reserve }
    ]
  });
}
