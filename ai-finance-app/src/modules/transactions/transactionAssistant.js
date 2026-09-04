import { getLocalDateKey } from '../../utils/date.js';
import { parseNaturalLanguageInput } from '../../utils/nlpParser.js';

const CORRECTION_WORDS = /(更正|修正|修改|改成|改為|不是.+(?:是|而是)|應該是|才對)/;
const ACCOUNTING_COMMAND_WORDS = /(記帳|幫我記|記一下|記錄|加入帳本)/;
const TRANSACTION_WORDS = /(花(?:費)?了|刷了|買了|吃了|搭了|領了|領到|收到|獲得|付了|繳了|退款|退費|儲值|課金)/;
const QUICK_ITEM_WORDS = /(早餐|午餐|晚餐|宵夜|飲料|咖啡|便當|公車|捷運|車資|遊戲|儲值|課金|房租|水費|電費|網路費|信用卡)/;
const RELATIVE_TARGET_WORDS = /(剛剛|剛才|上一筆|那筆)/;
const CONFIRM_WORDS = /^(對|是|沒錯|正確|可以|好|好的|幫我記|記下|確認)$/;
const CANCEL_WORDS = /^(不是|不對|先不要|不要|取消|算了)$/;

function parseAmount(value) {
  if (!value) return null;
  const normalized = value.replace(/,/g, '');
  const match = normalized.match(/(\d+)\s*萬\s*(\d+)?/);
  if (match) {
    return Number(match[1]) * 10000 + (match[2] ? Number(match[2]) * 1000 : 0);
  }
  const digits = normalized.match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

function getCorrectionAmount(text) {
  const explicit = text.match(/(?:改成|改為|應該是|而是)\s*[$＄]?\s*([\d,]+(?:\s*萬\s*\d*)?)/)
    || text.match(/[，,]\s*是\s*[$＄]?\s*([\d,]+(?:\s*萬\s*\d*)?)/)
    || text.match(/是\s*[$＄]?\s*([\d,]+(?:\s*萬\s*\d*)?)\s*才對/);
  if (explicit) return parseAmount(explicit[1]);

  const amounts = [...text.matchAll(/[$＄]?\s*(\d[\d,]*(?:\s*萬\s*\d*)?)\s*(?:元|塊)?/g)]
    .map((match) => parseAmount(match[1]))
    .filter((amount) => Number.isFinite(amount));
  return amounts.length ? amounts.at(-1) : null;
}

function getOriginalAmount(text, newAmount) {
  const explicit = text.match(/(?:不是|原本(?:是)?)\s*[$＄]?\s*([\d,]+(?:\s*萬\s*\d*)?)/);
  if (explicit) return parseAmount(explicit[1]);

  const amounts = [...text.matchAll(/[$＄]?\s*(\d[\d,]*(?:\s*萬\s*\d*)?)\s*(?:元|塊)?/g)]
    .map((match) => parseAmount(match[1]))
    .filter((amount) => Number.isFinite(amount));
  if (amounts.length >= 2) return amounts.find((amount) => amount !== newAmount) ?? amounts[0];
  return null;
}

function getTargetDate(text, now) {
  const date = new Date(now);
  if (text.includes('昨天')) date.setDate(date.getDate() - 1);
  if (text.includes('今天') || text.includes('昨天')) return getLocalDateKey(date);
  return null;
}

function getItemHints(text) {
  const knownHints = [
    '早餐', '午餐', '晚餐', '宵夜', '飲料', '咖啡', '便當', '公車', '捷運',
    '車資', '遊戲', '儲值', '課金', '房租', '水費', '電費', '網路費', '信用卡'
  ];
  return knownHints.filter((hint) => text.includes(hint));
}

function describeCandidates(candidates) {
  return candidates
    .slice(0, 3)
    .map((transaction) => `「${transaction.title}」$${transaction.amount}`)
    .join('、');
}

function selectCorrectionCandidate(text, candidates) {
  const ordinal = text.match(/第?([一二兩])筆/);
  const ordinalIndex = ordinal ? ({ 一: 0, 二: 1, 兩: 1 }[ordinal[1]]) : null;
  if (ordinalIndex !== null) return candidates[ordinalIndex] || null;

  const normalizedReply = text.replace(/[\s，,。.!！?？]/g, '');
  const nameMatches = candidates.filter((candidate) => {
    const normalizedTitle = candidate.title.replace(/\s/g, '');
    return normalizedReply.includes(normalizedTitle) || normalizedTitle.includes(normalizedReply);
  });
  if (nameMatches.length === 1) return nameMatches[0];

  const originalAmount = parseAmount(text);
  const amountMatches = originalAmount === null
    ? []
    : candidates.filter((candidate) => Number(candidate.amount) === originalAmount);
  return amountMatches.length === 1 ? amountMatches[0] : null;
}

function findCorrectionCandidates(request, transactions) {
  let candidates = transactions.filter((transaction) => transaction.type !== 'goal');

  if (request.date) {
    candidates = candidates.filter((transaction) => transaction.date === request.date);
  }
  if (request.originalAmount !== null) {
    candidates = candidates.filter((transaction) => transaction.amount === request.originalAmount);
  }
  if (request.itemHints.length) {
    candidates = candidates.filter((transaction) => request.itemHints.some((hint) =>
      transaction.title.includes(hint) || transaction.category.includes(hint)
    ));
  }

  if (request.isRelative && !request.itemHints.length && request.originalAmount === null) {
    return candidates.slice(0, 1);
  }
  return candidates;
}

function handleCorrection(text, transactions, now) {
  const newAmount = getCorrectionAmount(text);
  if (!newAmount || newAmount <= 0) {
    return {
      kind: 'clarification',
      pendingConfirmation: { mode: 'correction_amount', correctionText: text },
      reply: '可以，我會幫你修改。正確的金額是多少呢？'
    };
  }

  const request = {
    newAmount,
    originalAmount: getOriginalAmount(text, newAmount),
    date: getTargetDate(text, now),
    itemHints: getItemHints(text),
    isRelative: RELATIVE_TARGET_WORDS.test(text)
  };
  const candidates = findCorrectionCandidates(request, transactions);

  if (candidates.length === 0) {
    return {
      kind: 'clarification',
      reply: '我還找不到你指的那筆紀錄。可以再告訴我是什麼項目，或原本金額嗎？'
    };
  }
  if (candidates.length > 1) {
    const visibleCandidates = candidates.slice(0, 3);
    return {
      kind: 'clarification',
      pendingConfirmation: {
        mode: 'correction_candidate',
        candidateIds: visibleCandidates.map(({ id }) => id),
        newAmount,
        correctionText: text
      },
      reply: `我找到不只一筆可能的紀錄：${describeCandidates(visibleCandidates)}。你要改哪一筆呢？`
    };
  }

  const before = candidates[0];
  const corrected = { ...before, amount: newAmount, updatedAt: now.toISOString() };
  const nextTransactions = transactions.map((transaction) =>
    transaction.id === corrected.id ? corrected : transaction
  );

  return {
    kind: 'transaction_corrected',
    transactions: nextTransactions,
    transaction: corrected,
    previousTransaction: before,
    reply: `已把「${corrected.title}」從 $${before.amount} 改成 $${corrected.amount}，帳本和分析也一起更新了。`
  };
}

function createTransaction(parsed, now, index = 0) {
  return {
    id: `tx_${now.getTime()}_${index}`,
    type: parsed.type,
    title: parsed.title,
    amount: parsed.amount,
    category: parsed.category,
    emotion: parsed.emotion,
    date: parsed.date,
    sourceText: parsed.originalText,
    createdAt: now.toISOString()
  };
}

function cleanItemTitle(title) {
  return String(title || '')
    .replace(/^(我|這筆|然後)/, '')
    .replace(/(花費|花了|用了|是|共)$/, '')
    .trim() || '一般項目';
}

function parseMultipleItems(text, now) {
  const normalized = text.replace(/(\d),(?=\d{3}\b)/g, '$1');
  const segments = normalized.split(/[、，；;]/).map((part) => part.trim()).filter(Boolean);
  if (segments.length < 2) return [];

  const items = segments.map((segment) => {
    const parsed = parseNaturalLanguageInput(segment, now);
    if (!parsed || parsed.amount <= 0 || parsed.type === 'goal') return null;
    return { ...parsed, title: cleanItemTitle(parsed.title), originalText: text };
  }).filter(Boolean);

  return items.length >= 2 ? items : [];
}

function confirmationReply(items) {
  const details = items
    .map((item) => `${item.title}是 $${Number(item.amount).toLocaleString('zh-TW')}`)
    .join('、');
  return `這邊跟你確認，${details}，是這樣嗎？`;
}

function requestConfirmation(items, sourceText) {
  return {
    kind: 'confirmation_required',
    pendingConfirmation: { mode: 'confirmation', items, sourceText },
    reply: confirmationReply(items)
  };
}

function handlePendingConfirmation(text, pendingConfirmation, transactions, now) {
  if (pendingConfirmation.mode === 'correction_candidate') {
    if (CANCEL_WORDS.test(text)) {
      return { kind: 'confirmation_cancelled', reply: '好，這次先不修改。' };
    }
    const candidates = pendingConfirmation.candidateIds
      .map((id) => transactions.find((transaction) => transaction.id === id))
      .filter(Boolean);
    const selected = selectCorrectionCandidate(text, candidates);

    if (!selected) {
      return {
        kind: 'clarification',
        pendingConfirmation,
        reply: `我還不確定你指哪一筆：${describeCandidates(candidates)}。可以回答「第一筆」或「第二筆」。`
      };
    }

    const corrected = { ...selected, amount: pendingConfirmation.newAmount, updatedAt: now.toISOString() };
    return {
      kind: 'transaction_corrected',
      transactions: transactions.map((transaction) => transaction.id === selected.id ? corrected : transaction),
      transaction: corrected,
      previousTransaction: selected,
      reply: `已把「${corrected.title}」從 $${selected.amount} 改成 $${corrected.amount}，帳本和分析也一起更新了。`
    };
  }

  if (pendingConfirmation.mode === 'missing_amount') {
    if (CANCEL_WORDS.test(text)) {
      return { kind: 'confirmation_cancelled', reply: '好，這次先不記。' };
    }
    const amount = parseAmount(text);
    if (!amount || amount <= 0) {
      return {
        kind: 'clarification',
        pendingConfirmation,
        reply: `我還在等「${pendingConfirmation.item.title}」的金額，可以只回答數字，例如「110」。`
      };
    }
    const item = {
      ...pendingConfirmation.item,
      amount,
      originalText: `${pendingConfirmation.sourceText} ${text}`
    };
    const transaction = createTransaction(item, now);
    return {
      kind: 'transaction_added',
      transactions: [transaction, ...transactions],
      transaction,
      reply: `收到，已記下「${transaction.title}」$${transaction.amount}。`
    };
  }

  if (pendingConfirmation.mode === 'correction_amount') {
    if (CANCEL_WORDS.test(text)) {
      return { kind: 'confirmation_cancelled', reply: '好，這次先不修改。' };
    }
    const amount = parseAmount(text);
    if (!amount || amount <= 0) {
      return {
        kind: 'clarification',
        pendingConfirmation,
        reply: '請告訴我正確的金額，例如「130」。'
      };
    }
    return handleCorrection(`${pendingConfirmation.correctionText}，改成 ${amount}`, transactions, now);
  }

  if (CONFIRM_WORDS.test(text)) {
    const created = pendingConfirmation.items.map((item, index) => createTransaction(item, now, index));
    return {
      kind: created.length > 1 ? 'transactions_added' : 'transaction_added',
      transactions: [...created, ...transactions],
      transaction: created[0],
      addedTransactions: created,
      reply: created.length > 1
        ? `好了，${created.length} 筆都記下來了。`
        : `已記下「${created[0].title}」$${created[0].amount}。`
    };
  }
  if (CANCEL_WORDS.test(text)) {
    return { kind: 'confirmation_cancelled', reply: '好，這次先不記；你可以重新告訴我正確內容。' };
  }
  return {
    kind: 'clarification',
    pendingConfirmation,
    reply: '我還在等你確認剛才的內容。可以回答「是」或「不是」；如果金額有誤，也可以重新說一次。'
  };
}

/**
 * The single interface used by the UI for recording and correcting transactions.
 * It returns the next transaction list instead of mutating the caller's state.
 */
export function processFinanceMessage({ text, transactions, pendingConfirmation = null, now = new Date() }) {
  const cleanText = text.trim();
  if (!cleanText) return { kind: 'empty' };

  if (pendingConfirmation) {
    return handlePendingConfirmation(cleanText, pendingConfirmation, transactions, now);
  }

  if (CORRECTION_WORDS.test(cleanText)) {
    return handleCorrection(cleanText, transactions, now);
  }

  const multipleItems = parseMultipleItems(cleanText, now);
  if (multipleItems.length > 1) return requestConfirmation(multipleItems, cleanText);

  const parsed = parseNaturalLanguageInput(cleanText, now);
  if (!parsed) return { kind: 'empty' };

  if (parsed.intent === 'needs_clarification') {
    const title = cleanItemTitle(parsed.title);
    return {
      kind: 'clarification',
      reply: parsed.amount > 0
        ? '我讀到不只一個金額。請告訴我每一筆的項目和金額，我會分開記下來。'
        : `我知道你提到了「${title}」，但還缺少金額。大約是多少呢？`,
      pendingConfirmation: parsed.amount > 0 ? null : {
        mode: 'missing_amount',
        item: { ...parsed, title },
        sourceText: cleanText
      }
    };
  }

  if (parsed.type === 'goal') return { kind: 'chat', parsed };

  const hasTransactionPhrase = TRANSACTION_WORDS.test(cleanText);
  const hasAccountingCommand = ACCOUNTING_COMMAND_WORDS.test(cleanText);
  const isConciseTransaction = (hasTransactionPhrase || QUICK_ITEM_WORDS.test(cleanText))
    && !cleanText.startsWith('我')
    && cleanText.length <= 24;
  const isClearTransaction = parsed.amount > 0
    && (hasAccountingCommand || isConciseTransaction);

  if (!isClearTransaction) {
    if (parsed.amount > 0 && hasTransactionPhrase) {
      return requestConfirmation([{ ...parsed, title: cleanItemTitle(parsed.title) }], cleanText);
    }
    return { kind: 'chat', parsed };
  }

  const transaction = createTransaction(parsed, now);
  return {
    kind: 'transaction_added',
    transactions: [transaction, ...transactions],
    transaction,
    reply: `已記下「${transaction.title}」$${transaction.amount}。如果有記錯，直接告訴我改成多少就可以。`
  };
}
