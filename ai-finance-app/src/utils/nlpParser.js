import { getLocalDateKey } from './date.js';

// Dual-Track Natural Language Parsing Engine

export function parseNaturalLanguageInput(text, now = new Date()) {
  const cleanText = text.trim();
  if (!cleanText) return null;
  const amountText = cleanText.replace(/(\d),(?=\d{3}\b)/g, '$1');

  // 1. Identify Intent (income, goal, or expense)
  let intentType = 'expense'; // default
  let category = '其他';
  let emotion = '一般支出';

  // Keyword intent check
  if (/(薪水|薪資|發薪|收入|入帳|賺了|領了|領到|收到|獲得|工資|打工|獎金|獎學金|零用錢|退款|退費|家人給|媽媽給|爸爸給)/i.test(cleanText)) {
    intentType = 'income';
    category = /(退款|退費)/.test(cleanText) ? '退款' : '收入';
  } else if (
    (/(想存|存入|目標|夢想|旅遊|買車|買相機|買筆電|存錢)/i.test(cleanText) && /(存|目標|夢想)/i.test(cleanText))
    || /(想|希望|打算|計畫).*(去|旅行|旅遊|出國|買|存|參加|上.+課程|搬家)/i.test(cleanText)
  ) {
    intentType = 'goal';
    category = '儲蓄夢想';
  }

  // Category Keyword Classification
  if (intentType === 'income') {
    // Income keeps its own category even if the description contains other words.
  } else if (intentType === 'goal') {
    // Goal planning stays separate from ledger expense categories.
  } else if (/(早餐|午餐|晚餐|宵夜|便當|餐廳|吃了|餐費|咖啡|手搖|飲料|甜點|火鍋|燒肉)/i.test(cleanText)) {
    category = '飲食';
  } else if (/(公車|捷運|高鐵|計程車|車資|加油|車票|交通)/i.test(cleanText)) {
    category = '交通';
  } else if (/(電影|遊戲|儲值|課金|動漫|演唱會|展覽|娛樂|好玩|逛街)/i.test(cleanText)) {
    category = '娛樂';
    emotion = '衝動消費 💸';
  } else if (/(學費|書|課程|上課|補習|學習|教材|文具)/i.test(cleanText)) {
    category = '學習';
  } else if (/(看診|掛號|醫院|診所|藥局|藥品|醫療)/i.test(cleanText)) {
    category = '醫療';
  } else if (/(衛生棉|衛生紙|洗髮|沐浴|牙膏|日用品|生活用品|衣服|上衣|褲子|外套|鞋子|球鞋|洋裝)/i.test(cleanText)) {
    category = '日常';
  } else if (/(房租|水電|電費|網路費|信用卡|管理費|固定)/i.test(cleanText)) {
    category = '固定支出';
  } else if (/(大餐|咖啡|手搖|飲料|甜點|火鍋|燒肉|慶祝|犒賞)/i.test(cleanText)) {
    emotion = '犒賞自己 🎉';
  }

  // Extract Amount (numbers like 120, 120元, $120, 3萬5, 35000)
  let amount = 0;
  let amountCount = 0;
  
  // Check for "萬" e.g., 3萬5 -> 35000, 5萬 -> 50000
  const wanMatch = amountText.match(/(\d+)\s*萬\s*(\d+)?/);
  if (wanMatch) {
    const wanPart = parseInt(wanMatch[1], 10) * 10000;
    const thousandPart = wanMatch[2] ? parseInt(wanMatch[2], 10) * 1000 : 0;
    amount = wanPart + thousandPart;
    amountCount = 1;
  } else {
    // Normal digits match
    const digitMatches = amountText.match(/\d+/g);
    if (digitMatches && digitMatches.length > 0) {
      // Pick the last number or the most logical expenditure number
      amount = parseInt(digitMatches[digitMatches.length - 1], 10);
      amountCount = digitMatches.length;
    }
  }

  // Extract Title / Item Name
  let title = cleanText
    .replace(/(今天|昨天|前天|剛才|早上|中午|晚上)/g, '')
    .replace(/[\d,]+\s*(元|塊|千|萬|幣)?/g, '')
    .replace(/(記帳|幫我記|記一下|記錄|加入帳本|花了|刷了|買了|吃了|搭了|領了|領到|收到|獲得|存了|想買|想存)/g, '')
    .replace(/(多少錢?|很多錢|大概|幾塊|幾元)/g, '')
    .replace(/^(我|的)/g, '')
    .replace(/[，、。！？!?]/g, '')
    .replace(/(呢|喔|哦|啊)$/g, '')
    .trim();

  if (!title) {
    title = category === '飲食' ? '餐飲消費' : category === '交通' ? '車資支出' : '一般項目';
  }

  // Date parsing (default today YYYY-MM-DD)
  const today = new Date(now);
  let dateStr = getLocalDateKey(today);
  if (cleanText.includes('前天')) {
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(today.getDate() - 2);
    dateStr = getLocalDateKey(dayBeforeYesterday);
  } else if (cleanText.includes('昨天')) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    dateStr = getLocalDateKey(yesterday);
  }

  const looksLikeTransaction = /(花了|刷了|買了|吃了|搭了|領了|領到|收到|獲得|存了|付了|繳了|退款|退費)/.test(cleanText);
  const hasExplicitAccountingCommand = /(記帳|幫我記|記一下|記錄|加入帳本)/.test(cleanText);
  const intent = amountCount > 1
    ? 'needs_clarification'
    : amount > 0
      ? (hasExplicitAccountingCommand ? 'add_transaction' : 'confirm_transaction')
      : looksLikeTransaction
        ? 'needs_clarification'
        : 'chat';

  return {
    intent,
    type: intentType,
    title,
    amount: amount || 0,
    category,
    emotion,
    date: dateStr,
    originalText: text
  };
}
