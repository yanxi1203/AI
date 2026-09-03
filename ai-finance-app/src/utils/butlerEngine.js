// AI Butler Personality & Contextual Reply Engine

export function generateButlerReply({ type, title, amount, category, emotion }, metrics, settings = {}) {
  const name = settings.name || 'Fin';
  const isOverbudget = metrics.monthRemaining < 0;
  const isHighSpend = amount > (metrics.todayAvailable * 1.2);

  // Overbudget Serious Firm Warning
  if (isOverbudget && type === 'expense') {
    return `${name}：「注意了！我們目前已經超過本月預算囉！接下來幾天得嚴格執行控管，不能再隨便亂花錢了喔！」`;
  }

  // Income logged
  if (type === 'income') {
    return `${name}：「太棒了！收到這筆 $${amount.toLocaleString()} 元收入！記得撥一部分存進夢想基金，剩下的我們再來好好規劃～」`;
  }

  // Goal deposit logged
  if (type === 'goal') {
    return `${name}：「哼，不錯嘛！成功把 $${amount.toLocaleString()} 元存入夢想目標囉！離目標又近了一大步，繼續保持～」`;
  }

  // Impulse spending check
  if (emotion === '衝動消費 💸' || isHighSpend) {
    return `${name}：「這筆 $${amount} 元的 ${title} 好像有點大膽喔……哼，這次就算了，今天接下來可要稍微收斂一點喔！」`;
  }

  // Regular Expense Category replies
  if (category === '飲食') {
    return `${name}：「已為你記下 ${title} $${amount} 元！吃的倒是挺開心的嘛～記得補足水分健康飲食喔。」`;
  }

  if (category === '交通') {
    return `${name}：「出門在外注意安全！已幫你記下車資 $${amount} 元～」`;
  }

  // Default Tsundere positive encouragement
  return `${name}：「哼，這筆 $${amount} 元的 ${title} 紀錄完成！今天的剩餘額度還很充裕，控制得很好嘛～」`;
}

// Interactive Tsundere Chat Reply Engine for General Conversation & Q&A
export function generateButlerChatReply(text, metrics, settings = {}) {
  const name = settings.name || 'Fin';
  const input = text.trim();
  const tone = ['gentle', 'lively', 'strict'].includes(settings.tone) ? settings.tone : 'gentle';
  const say = (variants) => `${name}：「${variants[tone] || variants.gentle}」`;

  // Food mentioned without price (e.g. "剛剛的午餐吃滷肉飯，好好吃")
  if (/(吃|吃了|午餐|晚餐|早餐|滷肉飯|便當|火鍋|拉麵|牛肉麵|壽司|咖啡|飲料|甜點|漢堡|炸雞|手搖)/i.test(input) && !/\d+/.test(input)) {
    const foodMatch = input.match(/(滷肉飯|便當|火鍋|拉麵|牛肉麵|壽司|咖啡|飲料|甜點|漢堡|炸雞|手搖|午餐|晚餐|早餐|大餐)/i);
    const foodName = foodMatch ? foodMatch[0] : '美食';
    return say({
      gentle: `聽起來很好吃。這餐「${foodName}」大約花了多少呢？告訴我金額，我就能幫你記下來。`,
      lively: `好像很好吃耶！「${foodName}」花了多少？跟我說金額就能記帳。`,
      strict: `要把這餐記完整，還需要「${foodName}」的金額。直接告訴我數字即可。`
    });
  }

  if (/問你|問題|請教|你能做什麼|功能/i.test(input)) {
    return say({ gentle: '你可以問我怎麼記帳、查看預算或規劃夢想目標。', lively: '記帳、預算和夢想目標都可以問我！', strict: '我可以協助記帳、預算檢查與目標規劃。請直接告訴我需求。' });
  }

  if (/你是誰|介紹|名字|叫什麼/i.test(input)) {
    return say({ gentle: '我是你的財務管家，會陪你記帳、看預算，也一起規劃想完成的目標。', lively: '我是你的財務小管家！記帳、預算和夢想進度都交給我一起整理。', strict: '我是你的財務管家，負責整理帳目、提醒預算並追蹤目標。' });
  }

  if (/省錢|理財|建議|控制預算|怎麼存/i.test(input)) {
    return say({ gentle: '可以先連續記錄一週，再從最大的非必要支出開始調整；不用一次改得太勉強。', lively: '先記一週就好！找出最常出現的小支出，再挑一項開始調整。', strict: '先累積一週紀錄，再依支出占比調整；目前資料不足時不先給固定百分比。' });
  }

  if (/你好|嗨|哈囉|早安|午安|晚安|hi|hello/i.test(input)) {
    return say({ gentle: '你好，我在這裡。今天有花費、收入或想規劃的事情，都可以跟我說。', lively: '嗨！今天的花費、收入或新目標都可以交給我整理。', strict: '你好。請告訴我今天的收支或需要檢查的預算。' });
  }

  if (/謝謝|感謝|棒|厲害|愛你|讚/i.test(input)) {
    return say({ gentle: '不客氣，我會繼續陪你把帳目整理清楚。', lively: '不客氣！我們繼續把每一筆都整理好。', strict: '收到。我會繼續維持帳目與預算的準確。' });
  }

  if (/累|難過|心情|好煩|壓力/i.test(input)) {
    return say({ gentle: '辛苦了。先不用逼自己一次處理全部，我們可以從今天的一筆紀錄慢慢開始。', lively: '辛苦啦，先喘口氣；晚一點再從一筆紀錄開始也可以。', strict: '先休息一下。需要時再回來，我會從目前的帳目接著整理。' });
  }

  if (/討厭|笨|好貴|沒錢/i.test(input)) {
    return say({ gentle: '我知道錢不夠用會很有壓力。我們可以先看看最近最大的支出，再決定哪裡比較能調整。', lively: '先別慌，我們來找最近最大的一筆支出，看看有沒有比較輕鬆的調整方式。', strict: '先檢查本月最大支出與必要支出，再決定可調整的項目。' });
  }

  // Default warm Tsundere conversational reply
  return say({ gentle: '我在聽。你可以繼續聊天，也可以告訴我一筆收支或想完成的目標。', lively: '我在！想聊天、記帳或規劃目標都可以。', strict: '我在。請告訴我接下來要記錄的收支或要檢查的目標。' });
}

export function getButlerGreeting(metrics, settings = {}) {
  const name = settings.name || 'Fin';
  if (metrics.monthRemaining < 0) {
    return `${name}：「本月預算已告急！我們要一起加油守住荷包！」`;
  }
  if (metrics.todayAvailable < 100) {
    return `${name}：「今天的可用額度只剩 $${Math.round(metrics.todayAvailable)} 元囉，節約一點喔！」`;
  }
  return `${name}：「今天的支出整理完成，目前額度控制得挺不錯嘛～」`;
}
