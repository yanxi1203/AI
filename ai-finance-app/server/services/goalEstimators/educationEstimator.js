import { buildComponentEstimate } from './componentEstimate.js';

export function estimateEducationGoal({ title, requirements = {} }) {
  if (Number(requirements.courseFee || 0) <= 0) {
    throw new TypeError('請先提供課程費，或自行填寫目標金額');
  }
  return buildComponentEstimate({
    goalType: 'education',
    title,
    requiredMessage: '請補充課程費用，或自行填寫目標金額',
    items: [
      { id: 'course', label: '課程費', amount: requirements.courseFee },
      { id: 'materials', label: '教材費', amount: requirements.materialsFee },
      { id: 'exam', label: '考試或證照費', amount: requirements.examFee },
      { id: 'reserve', label: '其他預備金', amount: requirements.reserve }
    ]
  });
}
