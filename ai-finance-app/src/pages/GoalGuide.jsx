import { useMemo, useState } from 'react';
import { AlertCircle, ChevronRight, LoaderCircle, Sparkles, X } from 'lucide-react';
import {
  changeGoalStatus,
  createConfirmedGoal,
  createGoalPlans,
  detectGoalType,
  parseGoalAmount,
  updateGoalRecord
} from '../modules/goals/goalPlanner';
import { requestGoalEstimate } from '../modules/persistence/goalEstimateClient';

const money = (value) => Math.round(Number(value || 0)).toLocaleString('zh-TW');
const choice = (value, label) => ({ value, label });

const GOAL_TYPES = [
  { id: 'travel', label: '旅行', hint: '出國、自由行或國內旅行' },
  { id: 'product', label: '購買商品', hint: '電腦、手機、相機等' },
  { id: 'event', label: '活動或演唱會', hint: '門票、交通與住宿' },
  { id: 'education', label: '課程或證照', hint: '課程、教材與考試' },
  { id: 'custom', label: '其他目標', hint: '自己定義需要準備的費用' }
];

const DEFAULT_REQUIREMENTS = {
  travel: { destination: '', origin: '台灣桃園', travelers: '1', days: '5', nights: '4', style: 'balanced', includeShopping: false },
  product: { productType: 'computer', usage: 'undecided', level: 'balanced', includeAccessories: false },
  event: { ticketPrice: '', transport: '', needsAccommodation: false, accommodation: '', reserve: '' },
  education: { courseFee: '', materialsFee: '', examFee: '', reserve: '' },
  custom: { estimatedCost: '', reserve: '' }
};

function requirementQuestions(type, requirements) {
  if (type === 'travel') return [
    { key: 'destination', prompt: '想去哪裡？', kind: 'text', placeholder: '例如：日本東京', required: true },
    { key: 'origin', prompt: '從哪裡出發？', kind: 'text', placeholder: '台灣桃園', required: true },
    { key: 'travelers', prompt: '一共幾個人旅行？', kind: 'number', min: 1, required: true, note: '住宿會分攤，但結果只計算你個人要準備的金額。' },
    { key: 'days', prompt: '預計旅行幾天？', kind: 'number', min: 1, required: true },
    { key: 'nights', prompt: '其中住宿幾晚？', kind: 'number', min: 1, required: true },
    { key: 'style', prompt: '你比較偏好哪種旅行方式？', kind: 'choice', options: [choice('economy', '省錢'), choice('balanced', '一般'), choice('comfortable', '舒適')], required: true },
    { key: 'includeShopping', prompt: '要把購物預算算進去嗎？', kind: 'boolean', required: true }
  ];
  if (type === 'product') {
    const usageOptions = requirements.productType === 'computer'
      ? [choice('office', '文書與上網'), choice('graphic_design', '平面設計'), choice('development', '程式開發'), choice('gaming', '遊戲'), choice('video_3d', '影片剪輯／3D'), choice('undecided', '尚未決定')]
      : [choice('general', '日常使用'), choice('photo', '攝影創作'), choice('gaming', '遊戲'), choice('undecided', '尚未決定')];
    return [
      { key: 'productType', prompt: '想買哪一類商品？', kind: 'choice', options: [choice('computer', '電腦'), choice('phone', '手機'), choice('camera', '相機')], required: true },
      { key: 'usage', prompt: '主要會拿來做什麼？', kind: 'choice', options: usageOptions, required: true },
      { key: 'level', prompt: '希望是哪個等級？', kind: 'choice', options: [choice('entry', '入門'), choice('balanced', '平衡'), choice('high_end', '高階')], required: true },
      { key: 'includeAccessories', prompt: '要把配件一起算進去嗎？', kind: 'boolean', required: true }
    ];
  }
  if (type === 'event') return [
    { key: 'ticketPrice', prompt: '票價大約多少？', kind: 'number', min: 1, required: true },
    { key: 'transport', prompt: '來回交通預計多少？', kind: 'number', min: 0, required: false },
    { key: 'needsAccommodation', prompt: '需要住宿嗎？', kind: 'boolean', required: true },
    ...(requirements.needsAccommodation ? [{ key: 'accommodation', prompt: '住宿預計多少？', kind: 'number', min: 1, required: true }] : []),
    { key: 'reserve', prompt: '還要留多少其他預備金？', kind: 'number', min: 0, required: false }
  ];
  if (type === 'education') return [
    { key: 'courseFee', prompt: '課程費大約多少？', kind: 'number', min: 1, required: true },
    { key: 'materialsFee', prompt: '教材費大約多少？', kind: 'number', min: 0, required: false },
    { key: 'examFee', prompt: '考試或證照費大約多少？', kind: 'number', min: 0, required: false },
    { key: 'reserve', prompt: '還要留多少其他預備金？', kind: 'number', min: 0, required: false }
  ];
  return [
    { key: 'estimatedCost', prompt: '目前能先提供一個預計費用嗎？', kind: 'number', min: 1, required: true, note: '資料不足時，Fin 不會亂給精確數字。也可以返回上一頁改成「我知道金額」。' },
    { key: 'reserve', prompt: '還要留多少其他預備金？', kind: 'number', min: 0, required: false }
  ];
}

function normalizeRequirements(requirements) {
  const numberKeys = new Set(['travelers', 'days', 'nights', 'ticketPrice', 'transport', 'accommodation', 'reserve', 'courseFee', 'materialsFee', 'examFee', 'estimatedCost']);
  return Object.fromEntries(Object.entries(requirements).map(([key, value]) => (
    numberKeys.has(key) ? [key, value === '' ? 0 : Number(value)] : [key, value]
  )));
}

function goalCategory(type, requirements) {
  if (type === 'travel') return requirements.destination || '旅行';
  if (type === 'product') return requirements.productType || '商品';
  if (type === 'event') return '活動';
  if (type === 'education') return '學習';
  return '自訂';
}

export default function GoalGuide({ butlerName, editingGoal, monthlySavingCapacity, allocationStatus, onAddGoal, onUpdateGoal, onClose }) {
  const editing = Boolean(editingGoal);
  const [stage, setStage] = useState(editing ? 'savings' : 'name');
  const [stageHistory, setStageHistory] = useState([]);
  const [title, setTitle] = useState(editingGoal?.title || '');
  const [amountMode, setAmountMode] = useState(editing ? 'known' : null);
  const [amountInput, setAmountInput] = useState(editingGoal?.targetAmount ? String(editingGoal.targetAmount) : '');
  const [savedAmount, setSavedAmount] = useState(String(editingGoal?.savedAmount || 0));
  const [goalType, setGoalType] = useState(editingGoal?.type || null);
  const [requirements, setRequirements] = useState(editingGoal?.requirements || {});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [estimateResult, setEstimateResult] = useState(null);
  const [selectedCostId, setSelectedCostId] = useState(editingGoal?.estimation?.optionId || 'balanced');
  const [selectedPlanId, setSelectedPlanId] = useState(['comfortable', 'balanced', 'accelerated'].includes(editingGoal?.planId) ? editingGoal.planId : 'balanced');
  const [errorMessage, setErrorMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const targetAmount = parseGoalAmount(amountInput);
  const plans = useMemo(() => createGoalPlans({ targetAmount, savedAmount, preferredMonths: editingGoal?.planMonths || 12 }), [editingGoal?.planMonths, savedAmount, targetAmount]);
  const selectedPlan = plans.find(({ id }) => id === selectedPlanId) || plans[1];
  const selectedCost = estimateResult?.options.find(({ id }) => id === selectedCostId) || null;
  const questions = requirementQuestions(goalType, requirements);
  const currentQuestion = questions[Math.min(questionIndex, questions.length - 1)];
  const allocationPending = allocationStatus === 'pending-income';

  const markChanged = () => setDirty(true);
  const goTo = (nextStage) => { setStageHistory((history) => [...history, stage]); setStage(nextStage); setErrorMessage(''); };
  const requestClose = () => { if (dirty) setConfirmDiscard(true); else onClose(); };
  const goBack = () => {
    const previous = stageHistory.at(-1);
    if (!previous) return requestClose();
    setStageHistory((history) => history.slice(0, -1));
    setStage(previous);
    setErrorMessage('');
  };

  const chooseEstimate = () => {
    setAmountMode('estimate');
    const detected = detectGoalType(title);
    if (!detected) return goTo('type');
    setGoalType(detected);
    setRequirements({ ...DEFAULT_REQUIREMENTS[detected] });
    setQuestionIndex(0);
    goTo('requirements');
  };

  const continueKnownAmount = () => {
    if (targetAmount <= 0) return setErrorMessage('請輸入有效的目標金額，例如 30000、3萬或三萬。');
    setGoalType(detectGoalType(title) || editingGoal?.type || 'custom');
    setEstimateResult(null);
    goTo('savings');
  };

  const selectType = (type) => {
    setGoalType(type);
    setRequirements({ ...DEFAULT_REQUIREMENTS[type] });
    setQuestionIndex(0);
    markChanged();
    goTo('requirements');
  };
  const updateRequirement = (key, value) => { setRequirements((current) => ({ ...current, [key]: value })); markChanged(); setErrorMessage(''); };
  const questionIsValid = () => {
    const value = requirements[currentQuestion.key];
    if (!currentQuestion.required) return value === '' || Number(value) >= 0;
    if (currentQuestion.kind === 'number') return Number(value) >= Number(currentQuestion.min || 1);
    if (currentQuestion.kind === 'boolean') return typeof value === 'boolean';
    return String(value || '').trim().length > 0;
  };

  const performEstimate = async () => {
    setStageHistory((history) => [...history, 'requirements']);
    setStage('estimating');
    setErrorMessage('');
    try {
      const response = await requestGoalEstimate({ goalType, title: title.trim(), requirements: normalizeRequirements(requirements) });
      const preferred = response.estimate.options.some(({ id }) => id === requirements.style) ? requirements.style : 'balanced';
      const costOption = response.estimate.options.find(({ id }) => id === preferred) || response.estimate.options[1];
      setEstimateResult(response.estimate);
      setSelectedCostId(costOption.id);
      setAmountInput(String(costOption.recommendedAmount));
      setStage('estimate');
    } catch (error) {
      setErrorMessage(error.message || '目前無法完成估算，請稍後再試或自行填寫目標金額。');
      setStage('estimate-error');
    }
  };

  const continueRequirement = () => {
    if (!questionIsValid()) return setErrorMessage('請先完成這一題，再繼續下一步。');
    if (questionIndex < questions.length - 1) { setQuestionIndex((index) => index + 1); setErrorMessage(''); return; }
    performEstimate();
  };
  const backRequirement = () => {
    if (questionIndex > 0) { setQuestionIndex((index) => index - 1); setErrorMessage(''); return; }
    goBack();
  };
  const selectCostOption = (option) => { setSelectedCostId(option.id); setAmountInput(String(option.recommendedAmount)); markChanged(); };

  const buildGoalDraft = () => ({
    title: title.trim(),
    type: goalType || editingGoal?.type || 'custom',
    category: goalCategory(goalType || editingGoal?.type, requirements),
    targetAmount,
    savedAmount: Number(savedAmount || 0),
    requirements: Object.keys(requirements).length ? normalizeRequirements(requirements) : editingGoal?.requirements || {},
    estimation: selectedCost ? { optionId: selectedCost.id, minAmount: selectedCost.minAmount, maxAmount: selectedCost.maxAmount, recommendedAmount: selectedCost.recommendedAmount, sourceType: estimateResult.source.type, updatedAt: estimateResult.source.updatedAt } : editingGoal?.estimation
  });

  const saveGoal = () => {
    const draft = buildGoalDraft();
    if (editingGoal) {
      onUpdateGoal(updateGoalRecord(editingGoal, { ...draft, planId: selectedPlan.id, planMonths: selectedPlan.months, monthlyContribution: selectedPlan.monthlyContribution, targetDate: selectedPlan.targetDate, updatedAt: new Date().toISOString() }));
    } else {
      onAddGoal(createConfirmedGoal({ confirmed: true, draft, savingsPlan: selectedPlan }));
    }
    onClose();
  };
  const moveToHistory = (status) => {
    const updated = updateGoalRecord(editingGoal, { ...buildGoalDraft(), planId: selectedPlan.id, planMonths: selectedPlan.months, monthlyContribution: selectedPlan.monthlyContribution, targetDate: selectedPlan.targetDate, updatedAt: new Date().toISOString() });
    onUpdateGoal(changeGoalStatus(updated, status));
    onClose();
  };

  const renderQuestionInput = () => {
    const value = requirements[currentQuestion.key];
    if (currentQuestion.kind === 'choice') return <div className="goal-guide__choice-list">{currentQuestion.options.map((option) => <button type="button" key={option.value} className={value === option.value ? 'is-active' : ''} onClick={() => updateRequirement(currentQuestion.key, option.value)}>{option.label}</button>)}</div>;
    if (currentQuestion.kind === 'boolean') return <div className="goal-guide__choices"><button type="button" className={value === true ? 'is-active' : ''} onClick={() => updateRequirement(currentQuestion.key, true)}>要，一起估算</button><button type="button" className={value === false ? 'is-active' : ''} onClick={() => updateRequirement(currentQuestion.key, false)}>先不用</button></div>;
    return <label>{currentQuestion.prompt}<input type={currentQuestion.kind === 'number' ? 'number' : 'text'} min={currentQuestion.min} value={value ?? ''} onChange={(event) => updateRequirement(currentQuestion.key, event.target.value)} placeholder={currentQuestion.placeholder} autoFocus /></label>;
  };

  return <form className="goal-guide" onSubmit={(event) => event.preventDefault()}>
    <div className="goal-guide__heading"><span><Sparkles size={16} /></span><div><small>{butlerName} 陪你規劃</small><strong>{editing ? '調整這個夢想的規劃' : '先聊聊，再決定要不要建立'}</strong></div><button type="button" onClick={requestClose} aria-label="關閉夢想規劃"><X size={17} /></button></div>

    {stage === 'name' && <section className="goal-guide__step"><p className="goal-guide__reply">你最近最想完成什麼？</p><label>我的夢想<input value={title} onChange={(event) => { setTitle(event.target.value); markChanged(); }} placeholder="例如：去日本旅行" autoFocus /></label><button type="button" className="goal-guide__next" onClick={() => title.trim() && goTo('amount')} disabled={!title.trim()}>下一步 <ChevronRight size={15} /></button></section>}

    {stage === 'amount' && <section className="goal-guide__step"><p className="goal-guide__reply">你已經知道大約需要多少錢嗎？</p><div className="goal-guide__choices"><button type="button" className={amountMode === 'known' ? 'is-active' : ''} onClick={() => { setAmountMode('known'); markChanged(); }}>我知道金額</button><button type="button" className={amountMode === 'estimate' ? 'is-active' : ''} onClick={chooseEstimate}>請 {butlerName} 幫我估算</button></div>{amountMode === 'known' && <><label>預計需要<input type="text" inputMode="numeric" value={amountInput} onChange={(event) => { setAmountInput(event.target.value); markChanged(); setErrorMessage(''); }} placeholder="例如：30000、3萬或三萬" autoFocus /></label><button type="button" className="goal-guide__next" onClick={continueKnownAmount}>看看儲蓄方案 <ChevronRight size={15} /></button></>}{errorMessage && <p className="goal-guide__error" role="alert"><AlertCircle size={14} />{errorMessage}</p>}<button type="button" className="goal-guide__back" onClick={goBack}>回上一步</button></section>}

    {stage === 'type' && <section className="goal-guide__step"><p className="goal-guide__reply">我還不確定「{title}」屬於哪一類，請你選一個最接近的。</p><div className="goal-type-options">{GOAL_TYPES.map((type) => <button type="button" key={type.id} onClick={() => selectType(type.id)}><strong>{type.label}</strong><small>{type.hint}</small></button>)}</div><button type="button" className="goal-guide__back" onClick={goBack}>回上一步</button></section>}

    {stage === 'requirements' && currentQuestion && <section className="goal-guide__step"><small className="goal-guide__progress">問題 {questionIndex + 1}／{questions.length}</small>{!['text', 'number'].includes(currentQuestion.kind) && <p className="goal-guide__reply">{currentQuestion.prompt}</p>}{renderQuestionInput()}{currentQuestion.note && <p className="goal-guide__hint">{currentQuestion.note}</p>}{errorMessage && <p className="goal-guide__error" role="alert"><AlertCircle size={14} />{errorMessage}</p>}<button type="button" className="goal-guide__next" onClick={continueRequirement}>{questionIndex === questions.length - 1 ? `交給 ${butlerName} 估算` : '下一題'} <ChevronRight size={15} /></button><button type="button" className="goal-guide__back" onClick={backRequirement}>回上一步</button></section>}

    {stage === 'estimating' && <section className="goal-guide__step goal-guide__loading" role="status"><LoaderCircle size={24} /><strong>{butlerName} 正在整理參考費用</strong><p>會依照你剛才提供的條件，計算個人需要準備的金額。</p></section>}
    {stage === 'estimate-error' && <section className="goal-guide__step"><p className="goal-guide__reply">目前還不能完成這次估算。</p><p className="goal-guide__error" role="alert"><AlertCircle size={14} />{errorMessage}</p><button type="button" className="goal-guide__next" onClick={performEstimate}>再試一次</button><button type="button" className="goal-guide__back" onClick={goBack}>補充資料或改填金額</button></section>}

    {stage === 'estimate' && estimateResult && <section className="goal-guide__step"><p className="goal-guide__reply">我整理了三種費用範圍。先選目標金額，下一步才選存錢速度。</p><div className="goal-cost-options">{estimateResult.options.map((option) => <button type="button" key={option.id} className={selectedCostId === option.id ? 'is-active' : ''} onClick={() => selectCostOption(option)}><small>{option.label}</small><strong>${money(option.recommendedAmount)}</strong><span>${money(option.minAmount)}～${money(option.maxAmount)}</span></button>)}</div><div className="goal-estimate-breakdown"><strong>費用項目</strong>{estimateResult.breakdown.map((item) => <div key={item.id}><span>{item.label}<small>{item.note || ''}</small></span><b>${money(item.minAmount)}～${money(item.maxAmount)}</b></div>)}</div><label>自行修改目標金額<input type="text" inputMode="numeric" value={amountInput} onChange={(event) => { setAmountInput(event.target.value); markChanged(); }} /></label><p className={`goal-guide__notice ${estimateResult.source.type === 'offline_reference' ? 'is-offline' : ''}`}>{estimateResult.source.type === 'offline_reference' ? '離線參考估算' : '內建參考資料'} · 更新於 {estimateResult.source.updatedAt}<br />{estimateResult.source.disclaimer}</p><button type="button" className="goal-guide__next" onClick={() => targetAmount > 0 && goTo('savings')} disabled={targetAmount <= 0}>選擇儲蓄速度 <ChevronRight size={15} /></button><button type="button" className="goal-guide__back" onClick={goBack}>回上一步</button></section>}

    {stage === 'savings' && <section className="goal-guide__step"><p className="goal-guide__reply">費用目標是 ${money(targetAmount)}。接著想用多快的速度存到？</p>{editing && <label>目前已存<input type="number" min="0" value={savedAmount} onChange={(event) => { setSavedAmount(event.target.value); markChanged(); }} /></label>}<div className="goal-plan-options">{plans.map((plan) => <button type="button" key={plan.id} className={selectedPlanId === plan.id ? 'is-active' : ''} onClick={() => { setSelectedPlanId(plan.id); markChanged(); }}><small>{plan.label}速度</small><strong>{plan.months} 個月</strong><span>每月約 ${money(plan.monthlyContribution)}</span></button>)}</div>{allocationPending ? <p className="goal-guide__capacity">尚未設定收入，目前只能保存目標金額；補上收入後才能判斷每月存款是否合適。</p> : monthlySavingCapacity > 0 && <p className="goal-guide__capacity">目前每月預計儲蓄約 ${money(monthlySavingCapacity)}，你仍可先選擇適合自己的速度。</p>}<button type="button" className="goal-guide__next" onClick={() => goTo('confirm')}>確認規劃 <ChevronRight size={15} /></button><button type="button" className="goal-guide__back" onClick={goBack}>回上一步</button></section>}

    {stage === 'confirm' && <section className="goal-guide__step"><p className="goal-guide__reply">最後確認一次。按下按鈕後，才會把它加入你的夢想目標。</p><div className="goal-confirm-summary"><div><span>夢想</span><strong>{title}</strong></div><div><span>目標金額</span><strong>${money(targetAmount)}</strong></div>{selectedCost && <div><span>費用方案</span><strong>{selectedCost.label}</strong></div>}<div><span>儲蓄速度</span><strong>{selectedPlan.label} · {selectedPlan.months} 個月</strong></div><div><span>每月存款</span><strong>${money(selectedPlan.monthlyContribution)}</strong></div></div>{allocationPending && <p className="goal-guide__capacity">尚未設定收入，這次仍可保存目標；之後補上收入再檢查每月金額。</p>}<div className="goal-guide__actions"><button type="button" onClick={goBack}>回上一步</button><button type="button" className="goal-guide__confirm" onClick={saveGoal}>{editing ? '儲存修改' : '建立夢想目標'}</button></div>{editing && <div className="goal-guide__lifecycle"><p>也可以把這個夢想移到歷史紀錄，之後仍能恢復。</p><div><button type="button" onClick={() => moveToHistory('completed')}>標為完成</button><button type="button" onClick={() => moveToHistory('archived')}>暫時收起</button></div></div>}</section>}

    {confirmDiscard && <div className="goal-discard-confirm" role="dialog" aria-modal="true" aria-label="放棄尚未完成的夢想規劃"><strong>要離開這次規劃嗎？</strong><p>剛才填寫的內容還沒有建立，離開後會遺失。</p><div><button type="button" onClick={() => setConfirmDiscard(false)}>繼續填寫</button><button type="button" onClick={onClose}>捨棄內容</button></div></div>}
  </form>;
}
