import test from 'node:test';
import assert from 'node:assert/strict';
import { processFinanceMessage } from './transactionAssistant.js';

const NOW = new Date('2026-08-19T12:00:00+08:00');

function createFourSimilarTransactions() {
  return [
    { id: 'tx_1', type: 'expense', title: '午餐便當', amount: 110, category: '飲食', date: '2026-08-19' },
    { id: 'tx_2', type: 'expense', title: '午餐飲料', amount: 50, category: '飲食', date: '2026-08-19' },
    { id: 'tx_3', type: 'expense', title: '午餐麵包', amount: 40, category: '飲食', date: '2026-08-19' },
    { id: 'tx_4', type: 'expense', title: '午餐飯糰', amount: 70, category: '飲食', date: '2026-08-19' }
  ];
}

test('clear spending sentence is saved directly', () => {
  const result = processFinanceMessage({
    text: '今天午餐吃了110元',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'transaction_added');
  assert.equal(result.transaction.title, '午餐');
  assert.equal(result.transaction.amount, 110);
  assert.equal(result.transaction.type, 'expense');
});

test('quick-entry shorthand with an item and amount is saved directly', () => {
  const result = processFinanceMessage({
    text: '午餐 110 元',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'transaction_added');
  assert.equal(result.transaction.title, '午餐');
  assert.equal(result.transaction.amount, 110);
});

test('clear income sentence is saved as income', () => {
  const result = processFinanceMessage({
    text: '今天領了打工薪水3500元',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'transaction_added');
  assert.equal(result.transaction.type, 'income');
  assert.equal(result.transaction.amount, 3500);
});

test('family transfer and scholarship are recognized as income', () => {
  const familyTransfer = processFinanceMessage({
    text: '今天收到媽媽給的3000元',
    transactions: [],
    now: NOW
  });
  const scholarship = processFinanceMessage({
    text: '記帳領獎學金5000元',
    transactions: [],
    now: NOW
  });

  assert.equal(familyTransfer.kind, 'transaction_added');
  assert.equal(familyTransfer.transaction.type, 'income');
  assert.equal(scholarship.transaction.type, 'income');
});

test('thousands separators are treated as one amount', () => {
  const result = processFinanceMessage({
    text: '今天打工領到1,500元',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'transaction_added');
  assert.equal(result.transaction.type, 'income');
  assert.equal(result.transaction.amount, 1500);
});

test('unknown spending defaults to other instead of food', () => {
  const result = processFinanceMessage({
    text: '記帳買衛生棉120元',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'transaction_added');
  assert.equal(result.transaction.category, '日常');
});

test('Fin corrects one matching transaction without mutating the source', () => {
  const source = [
    { id: 'tx_1', type: 'expense', title: '午餐', amount: 110, category: '飲食', date: '2026-08-19' },
    { id: 'tx_2', type: 'expense', title: '飲料', amount: 50, category: '飲食', date: '2026-08-19' }
  ];
  const result = processFinanceMessage({
    text: '剛剛午餐不是110，是130',
    transactions: source,
    now: NOW
  });

  assert.equal(result.kind, 'transaction_corrected');
  assert.equal(result.transaction.id, 'tx_1');
  assert.equal(result.transaction.amount, 130);
  assert.equal(source[0].amount, 110);
});

test('Fin asks which record when more than one item matches', () => {
  const transactions = [
    { id: 'tx_1', type: 'expense', title: '午餐便當', amount: 110, category: '飲食', date: '2026-08-19' },
    { id: 'tx_2', type: 'expense', title: '午餐飲料', amount: 50, category: '飲食', date: '2026-08-19' }
  ];
  const result = processFinanceMessage({
    text: '今天午餐改成130',
    transactions,
    now: NOW
  });

  assert.equal(result.kind, 'clarification');
  assert.match(result.reply, /不只一筆/);
  assert.deepEqual(result.pendingConfirmation.candidateIds, ['tx_1', 'tx_2']);
  assert.equal(result.pendingConfirmation.newAmount, 130);

  const resolved = processFinanceMessage({
    text: '第一筆',
    transactions,
    pendingConfirmation: result.pendingConfirmation,
    now: NOW
  });

  assert.equal(resolved.kind, 'transaction_corrected');
  assert.equal(resolved.transaction.id, 'tx_1');
  assert.equal(resolved.transaction.amount, 130);
  assert.equal(resolved.transactions.find(({ id }) => id === 'tx_2').amount, 50);
});

test('a correction candidate can be selected by its item name', () => {
  const transactions = [
    { id: 'tx_1', type: 'expense', title: '午餐便當', amount: 110, category: '飲食', date: '2026-08-19' },
    { id: 'tx_2', type: 'expense', title: '午餐飲料', amount: 50, category: '飲食', date: '2026-08-19' }
  ];
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const resolved = processFinanceMessage({
    text: '午餐飲料',
    transactions,
    pendingConfirmation: question.pendingConfirmation,
    now: NOW
  });

  assert.equal(resolved.kind, 'transaction_corrected');
  assert.equal(resolved.transaction.id, 'tx_2');
  assert.equal(resolved.transactions.find(({ id }) => id === 'tx_1').amount, 110);
});

test('a fourth correction candidate can be selected by name without changing the other records', () => {
  const transactions = createFourSimilarTransactions();
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const resolved = processFinanceMessage({
    text: '午餐飯糰',
    transactions,
    pendingConfirmation: question.pendingConfirmation,
    now: NOW
  });

  assert.deepEqual(question.pendingConfirmation.candidateIds, ['tx_1', 'tx_2', 'tx_3', 'tx_4']);
  assert.match(question.reply, /還有 1 筆/);
  assert.equal(resolved.kind, 'transaction_corrected');
  assert.equal(resolved.transaction.id, 'tx_4');
  assert.equal(resolved.transaction.amount, 130);
  assert.deepEqual(
    resolved.transactions.filter(({ id }) => id !== 'tx_4'),
    transactions.filter(({ id }) => id !== 'tx_4')
  );
});

test('a correction candidate can be selected by its original amount', () => {
  const transactions = [
    { id: 'tx_1', type: 'expense', title: '午餐便當', amount: 110, category: '飲食', date: '2026-08-19' },
    { id: 'tx_2', type: 'expense', title: '午餐飲料', amount: 50, category: '飲食', date: '2026-08-19' }
  ];
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const resolved = processFinanceMessage({
    text: '原本 50 元那筆',
    transactions,
    pendingConfirmation: question.pendingConfirmation,
    now: NOW
  });

  assert.equal(resolved.kind, 'transaction_corrected');
  assert.equal(resolved.transaction.id, 'tx_2');
  assert.equal(resolved.transactions.find(({ id }) => id === 'tx_1').amount, 110);
});

test('a fourth correction candidate can be selected by its original amount', () => {
  const transactions = createFourSimilarTransactions();
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const resolved = processFinanceMessage({
    text: '原本 70 元那筆',
    transactions,
    pendingConfirmation: question.pendingConfirmation,
    now: NOW
  });

  assert.equal(resolved.kind, 'transaction_corrected');
  assert.equal(resolved.transaction.id, 'tx_4');
  assert.equal(resolved.transaction.amount, 130);
  assert.deepEqual(
    resolved.transactions.filter(({ id }) => id !== 'tx_4'),
    transactions.filter(({ id }) => id !== 'tx_4')
  );
});

test('the second correction candidate can be selected by ordinal', () => {
  const transactions = [
    { id: 'tx_1', type: 'expense', title: '午餐便當', amount: 110, category: '飲食', date: '2026-08-19' },
    { id: 'tx_2', type: 'expense', title: '午餐飲料', amount: 50, category: '飲食', date: '2026-08-19' }
  ];
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const resolved = processFinanceMessage({ text: '第二筆', transactions, pendingConfirmation: question.pendingConfirmation, now: NOW });

  assert.equal(resolved.transaction.id, 'tx_2');
  assert.equal(resolved.transactions.find(({ id }) => id === 'tx_1').amount, 110);
});

test('the fourth correction candidate can be selected by a Chinese ordinal', () => {
  const transactions = createFourSimilarTransactions();
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const resolved = processFinanceMessage({
    text: '第四筆',
    transactions,
    pendingConfirmation: question.pendingConfirmation,
    now: NOW
  });

  assert.equal(resolved.kind, 'transaction_corrected');
  assert.equal(resolved.transaction.id, 'tx_4');
  assert.equal(resolved.transaction.amount, 130);
  assert.deepEqual(
    resolved.transactions.filter(({ id }) => id !== 'tx_4'),
    transactions.filter(({ id }) => id !== 'tx_4')
  );
});

test('the fourth correction candidate can be selected by a numeric ordinal', () => {
  const transactions = createFourSimilarTransactions();
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const resolved = processFinanceMessage({
    text: '第4筆',
    transactions,
    pendingConfirmation: question.pendingConfirmation,
    now: NOW
  });

  assert.equal(resolved.kind, 'transaction_corrected');
  assert.equal(resolved.transaction.id, 'tx_4');
  assert.equal(resolved.transaction.amount, 130);
});

test('an invalid selection keeps all four correction candidates without changing records', () => {
  const transactions = createFourSimilarTransactions();
  const original = structuredClone(transactions);
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const unresolved = processFinanceMessage({
    text: '我不確定',
    transactions,
    pendingConfirmation: question.pendingConfirmation,
    now: NOW
  });

  assert.equal(unresolved.kind, 'clarification');
  assert.deepEqual(unresolved.pendingConfirmation.candidateIds, ['tx_1', 'tx_2', 'tx_3', 'tx_4']);
  assert.match(unresolved.reply, /還有 1 筆/);
  assert.deepEqual(transactions, original);
  assert.equal('transactions' in unresolved, false);
});

test('cancelling a four-candidate correction changes no records', () => {
  const transactions = createFourSimilarTransactions();
  const original = structuredClone(transactions);
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const cancelled = processFinanceMessage({
    text: '取消',
    transactions,
    pendingConfirmation: question.pendingConfirmation,
    now: NOW
  });

  assert.equal(cancelled.kind, 'confirmation_cancelled');
  assert.deepEqual(transactions, original);
  assert.equal('transactions' in cancelled, false);
});

test('an invalid correction selection keeps the candidates available', () => {
  const transactions = [
    { id: 'tx_1', type: 'expense', title: '午餐便當', amount: 110, category: '飲食', date: '2026-08-19' },
    { id: 'tx_2', type: 'expense', title: '午餐飲料', amount: 50, category: '飲食', date: '2026-08-19' }
  ];
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const unresolved = processFinanceMessage({ text: '我不確定', transactions, pendingConfirmation: question.pendingConfirmation, now: NOW });

  assert.equal(unresolved.kind, 'clarification');
  assert.deepEqual(unresolved.pendingConfirmation, question.pendingConfirmation);
  assert.match(unresolved.reply, /午餐便當/);
  assert.match(unresolved.reply, /午餐飲料/);
});

test('cancelling a correction selection leaves every transaction unchanged', () => {
  const transactions = [
    { id: 'tx_1', type: 'expense', title: '午餐便當', amount: 110, category: '飲食', date: '2026-08-19' },
    { id: 'tx_2', type: 'expense', title: '午餐飲料', amount: 50, category: '飲食', date: '2026-08-19' }
  ];
  const original = structuredClone(transactions);
  const question = processFinanceMessage({ text: '今天午餐改成130', transactions, now: NOW });
  const cancelled = processFinanceMessage({ text: '取消', transactions, pendingConfirmation: question.pendingConfirmation, now: NOW });

  assert.equal(cancelled.kind, 'confirmation_cancelled');
  assert.deepEqual(transactions, original);
  assert.equal('transactions' in cancelled, false);
});

test('Fin asks for the missing corrected amount', () => {
  const result = processFinanceMessage({
    text: '剛剛午餐要修改',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'clarification');
  assert.match(result.reply, /正確的金額/);
});

test('ordinary chat mentioning a price is not silently saved', () => {
  const result = processFinanceMessage({
    text: '我看到一款110元的遊戲，看起來很好玩',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'chat');
});

test('spending mentioned inside a chat asks before saving', () => {
  const result = processFinanceMessage({
    text: '我今天花了110元吃午餐',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'confirmation_required');
  assert.equal(result.pendingConfirmation.items.length, 1);
  assert.equal(result.pendingConfirmation.items[0].amount, 110);
  assert.match(result.reply, /是這樣嗎/);
});

test('multiple expenses are summarized into one confirmation', () => {
  const result = processFinanceMessage({
    text: '晚餐是120、飲料是50',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'confirmation_required');
  assert.deepEqual(result.pendingConfirmation.items.map((item) => item.amount), [120, 50]);
  assert.match(result.reply, /晚餐是 \$120/);
  assert.match(result.reply, /飲料是 \$50/);
});

test('confirming a pending multi-item message saves both transactions', () => {
  const pending = processFinanceMessage({
    text: '晚餐是120、飲料是50',
    transactions: [],
    now: NOW
  }).pendingConfirmation;
  const result = processFinanceMessage({
    text: '是',
    transactions: [],
    pendingConfirmation: pending,
    now: NOW
  });

  assert.equal(result.kind, 'transactions_added');
  assert.equal(result.addedTransactions.length, 2);
  assert.equal(result.transactions.length, 2);
});

test('missing amount asks only for the amount', () => {
  const result = processFinanceMessage({
    text: '今天午餐花了很多錢',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'clarification');
  assert.match(result.reply, /缺少金額/);
});

test('a number-only reply completes a pending missing amount', () => {
  const pendingResult = processFinanceMessage({
    text: '今天午餐花了很多錢',
    transactions: [],
    now: NOW
  });
  const result = processFinanceMessage({
    text: '110',
    transactions: [],
    pendingConfirmation: pendingResult.pendingConfirmation,
    now: NOW
  });

  assert.equal(result.kind, 'transaction_added');
  assert.equal(result.transaction.title, '午餐');
  assert.equal(result.transaction.amount, 110);
});

test('a number-only reply completes a pending correction amount', () => {
  const source = [{ id: 'tx_1', type: 'expense', title: '午餐', amount: 110, category: '飲食', date: '2026-08-19' }];
  const pendingResult = processFinanceMessage({
    text: '剛剛午餐要修改',
    transactions: source,
    now: NOW
  });
  const result = processFinanceMessage({
    text: '130',
    transactions: source,
    pendingConfirmation: pendingResult.pendingConfirmation,
    now: NOW
  });

  assert.equal(result.kind, 'transaction_corrected');
  assert.equal(result.transaction.amount, 130);
});

test('game top-up with a clear amount is saved directly', () => {
  const result = processFinanceMessage({
    text: '遊戲儲值300元',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'transaction_added');
  assert.equal(result.transaction.category, '娛樂');
  assert.equal(result.transaction.amount, 300);
});

test('dream sentence is routed to goal flow without adding a transaction', () => {
  const result = processFinanceMessage({
    text: '我想存錢去英國',
    transactions: [],
    now: NOW
  });

  assert.equal(result.kind, 'chat');
  assert.equal(result.parsed.type, 'goal');
});

test('dream planning sentences never become ledger expenses', () => {
  const messages = [
    '我想去日本玩一週',
    '我和朋友想去日本，但不知道要花多少',
    '我想買一台設計用電腦',
    '我想存三萬買筆電',
    '我想參加演唱會'
  ];

  for (const text of messages) {
    const result = processFinanceMessage({ text, transactions: [], now: NOW });
    assert.equal(result.kind, 'chat', text);
    assert.equal(result.parsed.type, 'goal', text);
    assert.equal('transactions' in result, false, text);
  }
});
