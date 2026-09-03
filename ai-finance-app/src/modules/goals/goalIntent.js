import { detectGoalType, parseGoalAmount } from './goalPlanner.js';

export const GOAL_INTENT_REPLY = '這聽起來像一個新的夢想。要一起看看大約需要多少錢，以及可以怎麼存嗎？';

function findGoalAmountText(sourceText) {
  const text = String(sourceText || '');
  return text.match(/(?:\d+(?:\.\d+)?|[零一二兩三四五六七八九十百千]+)\s*萬\s*(?:元|塊)?/)?.[0]
    || text.match(/(?:\d[\d,]*|[零一二兩三四五六七八九十百千]+)\s*(?:元|塊)/)?.[0]
    || text.match(/\d[\d,]{2,}/)?.[0]
    || '';
}

function cleanGoalTitle(sourceText, parsedTitle, knownAmountText) {
  let title = String(sourceText || '').trim()
    .replace(/[。！!？?]+$/g, '')
    .replace(/^(?:我|我們)?(?:最近)?(?:想要?|希望|打算|計畫)(?:要)?\s*/, '')
    .trim();

  if (knownAmountText) {
    title = title
      .replace(/^存(?:錢)?\s*/, '')
      .replace(knownAmountText, '')
      .replace(/^(?:來|去)?\s*/, '')
      .trim();
  } else {
    title = title.replace(/^買(?:一(?:台|部|個|組|張))?\s*/, '').trim();
  }

  return title || String(parsedTitle || '').trim() || '新的夢想';
}

export function createGoalDraftFromMessage({ sourceText, parsed } = {}) {
  const cleanSourceText = String(sourceText || parsed?.originalText || '').trim();
  const knownAmountText = findGoalAmountText(cleanSourceText);
  const amount = parseGoalAmount(knownAmountText);
  const knownAmount = amount > 0 ? amount : null;
  return {
    title: cleanGoalTitle(cleanSourceText, parsed?.title, knownAmountText),
    goalType: detectGoalType(cleanSourceText || parsed?.title),
    knownAmount,
    sourceText: cleanSourceText
  };
}

export function getGoalGuideInitialState(draft) {
  const title = String(draft?.title || '').trim();
  const knownAmount = Number(draft?.knownAmount || 0);
  return {
    stage: knownAmount > 0 ? 'savings' : title ? 'amount' : 'name',
    title,
    goalType: draft?.goalType || null,
    amountMode: knownAmount > 0 ? 'known' : null,
    amountInput: knownAmount > 0 ? String(knownAmount) : ''
  };
}

export function resolveGoalIntentAction(action, draft) {
  if (action === 'start') {
    return { nextPage: 'goals', openGuide: true, goalDraft: draft };
  }
  return { nextPage: null, openGuide: false, goalDraft: null };
}

export function getHomeAssistantInputCopy(butlerName = 'Fin') {
  const name = String(butlerName || 'Fin').trim() || 'Fin';
  const title = /[A-Za-z0-9]/.test(name) ? `和 ${name} 說說` : `和${name}說說`;
  return {
    title,
    subtitle: '記帳、問問題或規劃夢想',
    placeholder: '例如：午餐 110 元，或我想去日本旅行',
    regionLabel: `和${name}說說：記帳、問問題或規劃夢想`,
    inputLabel: `輸入要告訴${name}的記帳、財務問題或夢想內容`,
    sendLabel: `送出給${name}`
  };
}
