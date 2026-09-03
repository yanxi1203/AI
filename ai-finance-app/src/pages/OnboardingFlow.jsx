import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles, Trash2 } from 'lucide-react';
import finPlaceholder from '../assets/fin-placeholder.webp';
import { createFinancialSetup, createMonthlyPlan, validateFixedItems } from '../modules/finance/monthlyPlan';

const money = (value) => Math.max(0, Math.round(Number(value || 0))).toLocaleString('zh-TW');
const FIXED_OPTIONS = ['交通通勤', '手機網路', '訂閱服務', '房租住宿', '固定餐費', '其他'];
const FIN_POKE_MESSAGES = ['噗啾！', '我有在聽～', '再戳一下也可以。', '嗯？想跟我說什麼嗎？'];
const createFixedItem = (type = '其他', amount = '', source = 'preset') => ({
  id: `fixed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  type,
  title: type,
  amount,
  source
});

export default function OnboardingFlow({ settings, onComplete }) {
  const [step, setStep] = useState(0);
  const [finPokeCount, setFinPokeCount] = useState(0);
  const [finReaction, setFinReaction] = useState('');
  const [showFixedValidation, setShowFixedValidation] = useState(false);
  const reactionTimer = useRef(null);
  const [draft, setDraft] = useState(() => ({
    userName: '',
    incomeType: 'allowance',
    monthlyIncome: '',
    incomeUnknown: false,
    fixedItems: [],
    desiredSavings: '',
    butlerName: '',
    tone: 'gentle'
  }));

  useEffect(() => () => clearTimeout(reactionTimer.current), []);

  const pokeFin = () => {
    const nextCount = finPokeCount + 1;
    setFinPokeCount(nextCount);
    setFinReaction(FIN_POKE_MESSAGES[(nextCount - 1) % FIN_POKE_MESSAGES.length]);
    clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setFinReaction(''), 1800);
  };

  const allocation = useMemo(() => {
    const plan = createMonthlyPlan({
      incomeAmount: draft.monthlyIncome,
      incomeKnown: !draft.incomeUnknown,
      fixedItems: draft.fixedItems,
      desiredSavings: draft.desiredSavings
    });
    return {
      income: plan.incomeAmount,
      incomeKnown: plan.incomeKnown,
      fixed: plan.fixedReserved,
      shortfall: plan.shortfall,
      requestedSavings: plan.requestedSavings,
      savings: plan.plannedSavings,
      flexible: plan.flexibleBudget,
      monthlyBudget: plan.flexibleBudget,
      status: plan.status
    };
  }, [draft.desiredSavings, draft.fixedItems, draft.incomeUnknown, draft.monthlyIncome]);

  const fixedValidation = useMemo(() => validateFixedItems(draft.fixedItems), [draft.fixedItems]);
  const invalidFixedIds = useMemo(() => new Set(fixedValidation.invalidIds), [fixedValidation.invalidIds]);

  const toggleFixedType = (type) => setDraft((current) => {
    const existing = current.fixedItems.find((item) => item.type === type && item.source !== 'custom');
    return {
      ...current,
      fixedItems: existing
        ? current.fixedItems.filter((item) => item.id !== existing.id)
        : [...current.fixedItems, createFixedItem(type)]
    };
  });

  const updateFixedItem = (id, changes) => setDraft((current) => ({
    ...current,
    fixedItems: current.fixedItems.map((item) => item.id === id ? { ...item, ...changes } : item)
  }));

  const removeFixedItem = (id) => setDraft((current) => ({
    ...current,
    fixedItems: current.fixedItems.filter((item) => item.id !== id)
  }));

  const finish = () => {
    const financialSetup = createFinancialSetup({
      incomeAmount: draft.monthlyIncome,
      incomeKnown: !draft.incomeUnknown,
      fixedItems: draft.fixedItems.map(({ id, type, title, amount, source }) => ({
        id,
        type,
        title: title.trim() || type,
        amount,
        source
      })),
      desiredSavings: draft.desiredSavings
    });

    onComplete({
      monthlyBudget: financialSetup.monthlyBudget,
      settings: {
        ...settings,
        name: draft.butlerName.trim() || '小管家',
        tone: draft.tone,
        profile: {
          ...settings.profile,
          ...financialSetup.profile,
          userName: draft.userName.trim(),
          incomeType: draft.incomeType
        },
        allocation: financialSetup.allocation
      }
    });
  };

  const goToNextStep = () => {
    if (step === 2 && !fixedValidation.isValid) {
      setShowFixedValidation(true);
      return;
    }
    setShowFixedValidation(false);
    setStep((current) => current + 1);
  };

  return (
    <main className="onboarding-page">
      <div className="onboarding-progress" aria-label={'首次設定第 ' + (step + 1) + ' 步，共 4 步'}>
        {[0, 1, 2, 3].map((item) => <i key={item} className={step >= item ? 'is-active' : ''} />)}
      </div>

      {step === 0 && <section className="onboarding-welcome">
        <span className="onboarding-kicker">初次見面</span>
        <button type="button" className="onboarding-welcome-fin" onClick={pokeFin} aria-label="戳一下還沒有名字的小管家">
          <img key={`welcome-${finPokeCount}`} className={finReaction ? 'is-poked' : ''} src={finPlaceholder} alt="暫用的小管家" />
          {finReaction && <span className="fin-poke-reaction" aria-live="polite">{finReaction}</span>}
        </button>
        <div className="fin-speech"><strong>嗨，我還沒有名字。</strong><p>在開始整理你的錢之前，你願意先替我取一個名字嗎？</p></div>
        <label className="onboarding-name-first">幫小管家取名<input value={draft.butlerName} maxLength="12" onChange={(event) => setDraft({ ...draft, butlerName: event.target.value })} placeholder="輸入你喜歡的名字" autoFocus /></label>
        <button type="button" className="onboarding-primary" disabled={!draft.butlerName.trim()} onClick={() => setStep(1)}>你好，{draft.butlerName.trim() || '小管家'} <ArrowRight size={17} /></button>
      </section>}

      {step > 0 && <section className="onboarding-step">
        <header className="onboarding-step__header">
          <button type="button" className="onboarding-fin-button" onClick={pokeFin} aria-label={`戳一下 ${draft.butlerName}`}>
            <img key={`${step}-${finPokeCount}`} className={'onboarding-fin onboarding-fin--step-' + step + (finReaction ? ' is-poked' : '')} src={finPlaceholder} alt="" />
            {finReaction && <span className="fin-poke-reaction" aria-live="polite">{finReaction}</span>}
          </button>
          <div><small>{draft.butlerName} 想知道</small><h1>{step === 1 ? '你這個月預計會收到多少錢？' : step === 2 ? '有多少需要先留下來？' : '最後，決定我怎麼陪你。'}</h1></div>
        </header>

        {step === 1 && <div className="onboarding-form">
          <label>我可以怎麼稱呼你？<input value={draft.userName} onChange={(event) => setDraft({ ...draft, userName: event.target.value })} placeholder="暱稱（可以略過）" /></label>
          <fieldset><legend>主要來源</legend><div className="choice-grid">{[['allowance', '零用錢'], ['part-time', '打工收入'], ['salary', '薪水'], ['unstable', '不固定']].map(([id, label]) => <button type="button" key={id} className={draft.incomeType === id ? 'is-active' : ''} onClick={() => setDraft({ ...draft, incomeType: id })}>{label}</button>)}</div></fieldset>
          <label>本月預計收到的總金額<small>零用錢、打工或其他收入可以加在一起，這裡還不用扣固定支出。</small><div className="money-input"><span>$</span><input type="number" min="0" disabled={draft.incomeUnknown} value={draft.monthlyIncome} onChange={(event) => setDraft({ ...draft, monthlyIncome: event.target.value, incomeUnknown: false })} placeholder={draft.incomeType === 'unstable' ? '先填已確定會收到的金額' : '例如 15000'} aria-label="本月預計收到的總金額" /></div></label>
          <button type="button" className={`income-unknown ${draft.incomeUnknown ? 'is-active' : ''}`} aria-pressed={draft.incomeUnknown} onClick={() => setDraft({ ...draft, incomeUnknown: !draft.incomeUnknown, monthlyIncome: '' })}><Check size={13} />目前還不確定，之後再設定</button>
        </div>}

        {step === 2 && <div className="onboarding-form">
          <fieldset><legend>先加入你每月會固定支付的項目</legend><div className="fixed-choice-list">{FIXED_OPTIONS.map((item) => {
            const selected = draft.fixedItems.some((entry) => entry.type === item && entry.source !== 'custom');
            return <button type="button" key={item} className={selected ? 'is-active' : ''} aria-pressed={selected} onClick={() => toggleFixedType(item)}>{selected && <Check size={12} />}{item}</button>;
          })}</div></fieldset>
          <section className="fixed-expense-editor" aria-label="固定支出明細">
            <header><span>固定支出明細</span><button type="button" onClick={() => setDraft((current) => ({ ...current, fixedItems: [...current.fixedItems, createFixedItem('其他', '', 'custom')] }))}><Plus size={14} />新增一筆</button></header>
            {draft.fixedItems.length === 0
              ? <p className="fixed-expense-empty">還沒有項目，可以從上面快速加入。</p>
              : <div className="fixed-expense-list">{draft.fixedItems.map((item, index) => <div className={`fixed-expense-row${showFixedValidation && invalidFixedIds.has(item.id) ? ' is-invalid' : ''}`} key={item.id}>
                <label><span className="sr-only">第 {index + 1} 筆固定支出名稱</span><input value={item.title} onChange={(event) => updateFixedItem(item.id, { title: event.target.value })} placeholder="項目名稱" aria-label={`第 ${index + 1} 筆固定支出名稱`} /></label>
                <div className="fixed-expense-amount"><span>$</span><input type="number" min="0" value={item.amount} onChange={(event) => updateFixedItem(item.id, { amount: event.target.value })} placeholder="金額" aria-label={`${item.title || `第 ${index + 1} 筆`}金額`} aria-invalid={showFixedValidation && invalidFixedIds.has(item.id)} /></div>
                <button type="button" className="fixed-expense-remove" onClick={() => removeFixedItem(item.id)} aria-label={`刪除 ${item.title || `第 ${index + 1} 筆固定支出`}`}><Trash2 size={15} /></button>
              </div>)}</div>}
            {showFixedValidation && !fixedValidation.isValid && <p className="fixed-expense-validation" role="alert">還有 {fixedValidation.invalidCount} 筆固定支出沒有金額。請填入大於 0 的金額，或移除不需要的項目。</p>}
            <footer><span>每月固定支出合計</span><strong>NT$ {money(allocation.fixed)}</strong></footer>
          </section>
          <label>你希望每月存多少？<div className="money-input"><span>$</span><input type="number" min="0" value={draft.desiredSavings} onChange={(event) => setDraft({ ...draft, desiredSavings: event.target.value })} placeholder={`留空，交給 ${draft.butlerName} 推薦`} aria-label="希望每月儲蓄" /></div></label>
          <div className="fin-mini-note"><Sparkles size={15} /><p>如果留空，我會先用扣除固定支出後的 20% 試算，不會直接替你花錢。</p></div>
        </div>}

        {step === 3 && <div className="onboarding-form">
          <fieldset><legend>希望我怎麼跟你說話？</legend><div className="tone-choice">{[['gentle', '溫柔陪伴'], ['lively', '活潑一點'], ['strict', '直接清楚']].map(([id, label]) => <button type="button" key={id} className={draft.tone === id ? 'is-active' : ''} onClick={() => setDraft({ ...draft, tone: id })}>{label}</button>)}</div></fieldset>
          <div className="allocation-card">
            <div><span>本月預計收到</span><strong>{draft.incomeUnknown ? '尚未設定' : `NT$ ${money(allocation.income)}`}</strong></div>
            <div><span>固定支出</span><strong>NT$ {money(allocation.fixed)}</strong></div>
            <div className="is-accent"><span>建議先存</span><strong>{allocation.incomeKnown ? `NT$ ${money(allocation.savings)}` : '待收入設定後估算'}</strong></div>
            <div><span>日常可安排</span><strong>{allocation.incomeKnown ? `NT$ ${money(allocation.flexible)}` : '待收入設定後估算'}</strong></div>
            {!allocation.incomeKnown
              ? <p>{draft.userName ? draft.userName + '，' : ''}我先記住固定支出；等你補上收入後，再一起估算儲蓄和日常預算，不會先判定你超支。</p>
              : allocation.shortfall > 0
              ? <p className="is-warning">固定支出比收入多 NT$ {money(allocation.shortfall)}，目前沒有可分配的日常預算；請先調整收入或固定支出。</p>
              : <p>{draft.userName ? draft.userName + '，' : ''}我先照這個方式幫你看著；之後隨時都能回設定調整。</p>}
          </div>
        </div>}

        <footer className="onboarding-footer">
          <button type="button" className="onboarding-back" onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft size={17} />上一步</button>
          {step < 3
            ? <button type="button" className="onboarding-primary" disabled={step === 1 && allocation.income <= 0 && !draft.incomeUnknown} onClick={goToNextStep}>下一步 <ArrowRight size={17} /></button>
            : <button type="button" className="onboarding-primary" onClick={finish}><Check size={17} />就先這樣開始</button>}
        </footer>
      </section>}
    </main>
  );
}
