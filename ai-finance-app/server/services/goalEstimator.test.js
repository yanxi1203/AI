import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateGoal } from './goalEstimator.js';

test('travel estimator returns the shared estimate contract', () => {
  const estimate = estimateGoal({
    goalType: 'travel',
    title: '日本旅行',
    requirements: {
      destination: '日本東京',
      origin: '台灣桃園',
      travelers: 1,
      days: 5,
      nights: 4,
      style: 'balanced',
      includeShopping: false
    }
  });

  assert.equal(estimate.goalType, 'travel');
  assert.equal(estimate.title, '日本旅行');
  assert.equal(estimate.currency, 'TWD');
  assert.deepEqual(estimate.options.map(({ id }) => id), ['economy', 'balanced', 'comfortable']);
  assert.ok(estimate.options.every((option) => (
    option.minAmount > 0
    && option.minAmount <= option.recommendedAmount
    && option.recommendedAmount <= option.maxAmount
  )));
  assert.ok(estimate.breakdown.some(({ id }) => id === 'transport'));
  assert.ok(estimate.breakdown.some(({ id }) => id === 'accommodation'));
  assert.deepEqual(Object.keys(estimate.source).sort(), ['disclaimer', 'type', 'updatedAt']);
  assert.equal(estimate.source.type, 'internal_reference');
  assert.match(estimate.source.disclaimer, /並非即時報價/);
});

test('product goals use a different estimator and vary by computer usage and level', () => {
  const officeEntry = estimateGoal({
    goalType: 'product',
    title: '上課用筆電',
    requirements: {
      productType: 'computer',
      usage: 'office',
      level: 'entry',
      includeAccessories: false
    }
  });
  const designBalanced = estimateGoal({
    goalType: 'product',
    title: '設計用筆電',
    requirements: {
      productType: 'computer',
      usage: 'graphic_design',
      level: 'balanced',
      includeAccessories: true
    }
  });

  assert.equal(officeEntry.goalType, 'product');
  assert.equal(designBalanced.goalType, 'product');
  assert.deepEqual(designBalanced.options.map(({ id }) => id), ['economy', 'balanced', 'comfortable']);
  assert.ok(designBalanced.options[1].recommendedAmount > officeEntry.options[1].recommendedAmount);
  assert.ok(designBalanced.breakdown.some(({ id }) => id === 'accessories'));
});

test('two travelers split accommodation while the goal stays one users personal amount', () => {
  const oneTraveler = estimateGoal({
    goalType: 'travel',
    title: '日本旅行',
    requirements: { destination: '日本', travelers: 1, days: 5, nights: 4, style: 'balanced' }
  });
  const twoTravelers = estimateGoal({
    goalType: 'travel',
    title: '日本旅行',
    requirements: { destination: '日本', travelers: 2, days: 5, nights: 4, style: 'balanced' }
  });

  const oneAccommodation = oneTraveler.breakdown.find(({ id }) => id === 'accommodation');
  const twoAccommodation = twoTravelers.breakdown.find(({ id }) => id === 'accommodation');
  assert.equal(oneAccommodation.recommendedAmount, 16800);
  assert.equal(twoAccommodation.recommendedAmount, 8400);
  assert.ok(twoTravelers.options[1].recommendedAmount < oneTraveler.options[1].recommendedAmount);
  assert.match(twoAccommodation.note, /2 人分攤/);
});

test('all supported estimators use the same estimate contract', () => {
  const estimates = [
    estimateGoal({
      goalType: 'travel',
      title: '日本旅行',
      requirements: { destination: '日本', travelers: 1, days: 5, nights: 4, style: 'balanced' }
    }),
    estimateGoal({
      goalType: 'product',
      title: '設計用筆電',
      requirements: { productType: 'computer', usage: 'graphic_design', level: 'balanced' }
    }),
    estimateGoal({
      goalType: 'event',
      title: '參加演唱會',
      requirements: { ticketPrice: 4800, transport: 1200, accommodation: 2400, reserve: 1000 }
    }),
    estimateGoal({
      goalType: 'education',
      title: '上設計課程',
      requirements: { courseFee: 18000, materialsFee: 2000, examFee: 1500, reserve: 1000 }
    }),
    estimateGoal({
      goalType: 'custom',
      title: '搬家',
      requirements: { estimatedCost: 30000, reserve: 3000 }
    })
  ];

  for (const estimate of estimates) {
    assert.deepEqual(Object.keys(estimate).sort(), ['breakdown', 'currency', 'goalType', 'options', 'source', 'title']);
    assert.equal(estimate.currency, 'TWD');
    assert.deepEqual(estimate.options.map(({ id }) => id), ['economy', 'balanced', 'comfortable']);
    assert.ok(Array.isArray(estimate.breakdown));
    assert.ok(estimate.breakdown.length >= 1);
    assert.equal(estimate.source.type, 'internal_reference');
  }
});
