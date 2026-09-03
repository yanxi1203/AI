import { estimateTravelGoal } from './goalEstimators/travelEstimator.js';
import { estimateProductGoal } from './goalEstimators/productEstimator.js';
import { estimateEventGoal } from './goalEstimators/eventEstimator.js';
import { estimateEducationGoal } from './goalEstimators/educationEstimator.js';
import { estimateCustomGoal } from './goalEstimators/customEstimator.js';

const ESTIMATORS = {
  travel: estimateTravelGoal,
  product: estimateProductGoal,
  event: estimateEventGoal,
  education: estimateEducationGoal,
  custom: estimateCustomGoal
};

export function estimateGoal({ goalType, title, requirements = {} } = {}) {
  const estimator = ESTIMATORS[goalType];
  if (!estimator) throw new TypeError('尚未支援這個夢想類型的估算');
  if (!String(title || '').trim()) throw new TypeError('夢想名稱不能留空');
  return estimator({ title, requirements });
}
