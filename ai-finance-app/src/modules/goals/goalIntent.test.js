import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOAL_INTENT_REPLY,
  createGoalDraftFromMessage,
  getGoalGuideInitialState,
  getHomeAssistantInputCopy,
  resolveGoalIntentAction
} from './goalIntent.js';

test('home assistant input describes accounting, questions and dream planning', () => {
  assert.equal(getHomeAssistantInputCopy('Fin').title, '和 Fin 說說');
  assert.deepEqual(getHomeAssistantInputCopy('小財'), {
    title: '和小財說說',
    subtitle: '記帳、問問題或規劃夢想',
    placeholder: '例如：午餐 110 元，或我想去日本旅行',
    regionLabel: '和小財說說：記帳、問問題或規劃夢想',
    inputLabel: '輸入要告訴小財的記帳、財務問題或夢想內容',
    sendLabel: '送出給小財'
  });
});

test('a recognized dream creates a temporary planning draft and the requested reply', () => {
  const draft = createGoalDraftFromMessage({
    sourceText: '我想買一台設計用電腦',
    parsed: { type: 'goal', title: '設計用電腦' }
  });

  assert.deepEqual(draft, {
    title: '設計用電腦',
    goalType: 'product',
    knownAmount: null,
    sourceText: '我想買一台設計用電腦'
  });
  assert.equal(GOAL_INTENT_REPLY, '這聽起來像一個新的夢想。要一起看看大約需要多少錢，以及可以怎麼存嗎？');
});

test('Chinese ten-thousand notation is carried into the draft as a known amount', () => {
  const draft = createGoalDraftFromMessage({
    sourceText: '我想存三萬買筆電',
    parsed: { type: 'goal' }
  });

  assert.equal(draft.title, '買筆電');
  assert.equal(draft.goalType, 'product');
  assert.equal(draft.knownAmount, 30000);
});

test('starting planning keeps the draft and opens the existing goals guide', () => {
  const draft = createGoalDraftFromMessage({ sourceText: '我想去日本旅行', parsed: { type: 'goal' } });
  assert.deepEqual(resolveGoalIntentAction('start', draft), {
    nextPage: 'goals',
    openGuide: true,
    goalDraft: draft
  });
});

test('dismissing a dream clears only the temporary draft and creates no goal', () => {
  const draft = createGoalDraftFromMessage({ sourceText: '我想參加演唱會', parsed: { type: 'goal' } });
  assert.deepEqual(resolveGoalIntentAction('dismiss', draft), {
    nextPage: null,
    openGuide: false,
    goalDraft: null
  });
});

test('the existing goal guide starts after fields already supplied by the user', () => {
  assert.deepEqual(getGoalGuideInitialState({
    title: '設計用電腦',
    goalType: 'product',
    knownAmount: null,
    sourceText: '我想買一台設計用電腦'
  }), {
    stage: 'amount',
    title: '設計用電腦',
    goalType: 'product',
    amountMode: null,
    amountInput: ''
  });

  assert.deepEqual(getGoalGuideInitialState({
    title: '買筆電',
    goalType: 'product',
    knownAmount: 30000,
    sourceText: '我想存三萬買筆電'
  }), {
    stage: 'savings',
    title: '買筆電',
    goalType: 'product',
    amountMode: 'known',
    amountInput: '30000'
  });
});
