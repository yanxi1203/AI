import { useMemo, useState } from 'react';
import {
  Archive, CheckCircle2, ChevronRight, Pencil, Plus, RotateCcw, Sparkles, Target, Trash2, X
} from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import {
  changeGoalStatus, createGoalPlans, estimateGoalAmount, groupGoalsByStatus, updateGoalRecord
} from '../modules/goals/goalPlanner';

const money = (value) => Math.round(Number(value || 0)).toLocaleString('zh-TW');

export default function GoalsPage({ goals = [], butlerName = 'Fin', monthlySavingCapacity = 0, allocationStatus = 'ready', onBack, onAddGoal, onUpdateGoal, onDeleteGoal }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [stage, setStage] = useState('name');
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('0');
  const [amountMode, setAmountMode] = useState(null);
  const [estimateInfo, setEstimateInfo] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('balanced');
  const [showHistory, setShowHistory] = useState(false);

  const plans = useMemo(() => createGoalPlans({ targetAmount, savedAmount }), [savedAmount, targetAmount]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || plans[1];
  const editingGoal = goals.find((goal) => goal.id === editingGoalId) || null;
  const goalGroups = useMemo(() => groupGoalsByStatus(goals), [goals]);
  const allocationPending = allocationStatus === 'pending-income';
  const historyGoals = useMemo(() => [...goalGroups.completed, ...goalGroups.archived].sort((left, right) => {
    const leftDate = left.completedAt || left.archivedAt || '';
    const rightDate = right.completedAt || right.archivedAt || '';
    return rightDate.localeCompare(leftDate);
  }), [goalGroups.archived, goalGroups.completed]);

  const openGuide = () => {
    setStage('name');
    setEditingGoalId(null);
    setTitle('');
    setTargetAmount('');
    setSavedAmount('0');
    setAmountMode(null);
    setEstimateInfo(null);
    setSelectedPlanId('balanced');
    setIsAdding(true);
  };

  const openEdit = (goal) => {
    setEditingGoalId(goal.id);
    setTitle(goal.title || '');
    setTargetAmount(String(goal.targetAmount || ''));
    setSavedAmount(String(goal.savedAmount || 0));
    setAmountMode('known');
    setEstimateInfo(null);
    setSelectedPlanId(['comfortable', 'balanced', 'accelerated'].includes(goal.planId) ? goal.planId : 'balanced');
    setStage('review');
    setIsAdding(true);
  };

  const closeGuide = () => setIsAdding(false);

  const continueFromName = () => {
    if (!title.trim()) return;
    setStage('amount');
  };

  const askFinToEstimate = () => {
    const estimate = estimateGoalAmount(title);
    setAmountMode('estimate');
    setEstimateInfo(estimate);
    setTargetAmount(String(estimate.amount));
    setStage('review');
  };

  const continueWithKnownAmount = () => {
    if (Number(targetAmount) <= 0) return;
    setEstimateInfo(null);
    setStage('review');
  };

  const buildGoalChanges = () => ({
      id: `goal_${Date.now()}`,
      title: title.trim(),
      targetAmount: Number(targetAmount),
      savedAmount: Math.max(0, Number(savedAmount || 0)),
      targetDate: selectedPlan.targetDate,
      category: estimateInfo?.category || editingGoal?.category || '自訂',
      planId: selectedPlan.id,
      planMonths: selectedPlan.months,
      monthlyContribution: selectedPlan.monthlyContribution,
      estimateSource: estimateInfo?.source || editingGoal?.estimateSource || '使用者提供',
      status: editingGoal?.status || 'active',
      createdAt: editingGoal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
  });

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim() || Number(targetAmount) <= 0 || !selectedPlan) return;
    const changes = buildGoalChanges();

    if (editingGoal) {
      onUpdateGoal(updateGoalRecord(editingGoal, changes));
    } else {
      onAddGoal(changes);
    }
    closeGuide();
  };

  const moveGoalToHistory = (status) => {
    if (!editingGoal) return;
    const savedDraft = updateGoalRecord(editingGoal, buildGoalChanges());
    onUpdateGoal(changeGoalStatus(savedDraft, status));
    closeGuide();
    setShowHistory(true);
  };

  const restoreGoal = (goal) => onUpdateGoal(changeGoalStatus(goal, 'active'));

  const deleteGoal = (goal) => {
    if (!window.confirm(`確定永久刪除「${goal.title}」嗎？這個動作無法復原。`)) return;
    onDeleteGoal?.(goal.id);
  };

  return (
    <main className="page subpage goals-page">
      <PageHeader eyebrow="夢想規劃" title="我的夢想目標" onBack={onBack} action={<button type="button" className="icon-button" onClick={openGuide} aria-label="新增夢想目標"><Plus size={19} /></button>} />
      <section className="goals-intro"><div><h2>慢慢完成想做的事</h2><strong>進行中 {goalGroups.active.length} 個</strong></div><p>不知道目標金額也沒關係，之後可以請 {butlerName} 參考行情幫你估算。</p></section>
      <section className="goals-list">
        {goalGroups.active.map((goal) => {
          const percent = goal.targetAmount ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
          const remaining = goal.targetAmount ? Math.max(0, goal.targetAmount - goal.savedAmount) : null;
          return <article className="goal-card" key={goal.id}><span className="soft-icon soft-icon--peach"><Target size={18} /></span><div><div><strong>{goal.title}</strong><span>{goal.targetAmount ? `${percent}%` : '待估算'}</span></div><p>{goal.targetAmount ? `$${money(goal.savedAmount)}／$${money(goal.targetAmount)}` : '尚未設定目標金額'}</p><div className="progress-track"><i style={{ width: `${percent}%` }} /></div>{remaining !== null && <small>{goal.planMonths ? `${goal.planMonths} 個月方案` : '平衡方案'}：每月存 ${money(goal.monthlyContribution || Math.ceil(remaining / 12 / 100) * 100)}</small>}</div><button type="button" className="goal-card__edit" onClick={() => openEdit(goal)} aria-label={`調整${goal.title}`}><Pencil size={15} /><span>調整</span></button></article>;
        })}
        {!goalGroups.active.length && <div className="goals-empty"><Target size={20} /><div><strong>目前沒有進行中的目標</strong><p>{historyGoals.length ? '可以建立新的夢想，或從下方歷史紀錄恢復。' : '寫下現在最想完成的一件事就可以開始。'}</p></div></div>}
      </section>
      <button type="button" className="primary-soft-button" onClick={openGuide}><Plus size={18} />建立新的夢想目標</button>

      {historyGoals.length > 0 && <section className="goal-history-section">
        <button type="button" className={`goal-history-toggle ${showHistory ? 'is-open' : ''}`} onClick={() => setShowHistory((current) => !current)} aria-expanded={showHistory}>
          <span>已完成與封存</span><small>{historyGoals.length} 個</small><ChevronRight size={16} />
        </button>
        {showHistory && <div className="goal-history-list">{historyGoals.map((goal) => {
          const completed = goal.status === 'completed';
          return <article key={goal.id}><span className={`goal-history-status ${completed ? 'is-completed' : ''}`}>{completed ? <CheckCircle2 size={15} /> : <Archive size={15} />}</span><div><strong>{goal.title}</strong><small>{completed ? '已完成' : '已封存'}{goal.targetAmount ? ` · 目標 $${money(goal.targetAmount)}` : ''}</small></div><div className="goal-history-actions"><button type="button" onClick={() => restoreGoal(goal)}><RotateCcw size={14} />恢復</button><button type="button" onClick={() => deleteGoal(goal)}><Trash2 size={14} />刪除</button></div></article>;
        })}</div>}
      </section>}

      {isAdding && <form className="goal-guide" onSubmit={submit}>
        <div className="goal-guide__heading"><span><Sparkles size={16} /></span><div><small>{butlerName} 陪你規劃</small><strong>{editingGoal ? '調整這個夢想的規劃' : '先聊聊，再決定要不要建立'}</strong></div><button type="button" onClick={closeGuide} aria-label="關閉夢想規劃"><X size={17} /></button></div>

        {stage === 'name' && <section className="goal-guide__step">
          <p className="goal-guide__reply">你最近最想完成什麼？不用先想金額，告訴我名稱就可以。</p>
          <label>我的夢想<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：去英國看雪" autoFocus /></label>
          <button type="button" className="goal-guide__next" onClick={continueFromName} disabled={!title.trim()}>告訴 {butlerName} <ChevronRight size={15} /></button>
        </section>}

        {stage === 'amount' && <section className="goal-guide__step">
          <p className="goal-guide__reply">「{title}」聽起來很不錯。你已經知道大約需要多少錢嗎？</p>
          <div className="goal-guide__choices">
            <button type="button" className={amountMode === 'known' ? 'is-active' : ''} onClick={() => setAmountMode('known')}>我知道金額</button>
            <button type="button" onClick={askFinToEstimate}>請 {butlerName} 先估算</button>
          </div>
          {amountMode === 'known' && <><label>預計需要<input type="number" min="1" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="例如：50000" autoFocus /></label><button type="button" className="goal-guide__next" onClick={continueWithKnownAmount} disabled={Number(targetAmount) <= 0}>看看儲蓄方案 <ChevronRight size={15} /></button></>}
          <button type="button" className="goal-guide__back" onClick={() => setStage('name')}>回上一步</button>
        </section>}

        {stage === 'review' && <section className="goal-guide__step">
          <p className="goal-guide__reply">{estimateInfo ? `我先依照「${estimateInfo.label}」整理一個參考金額，你可以直接修改。` : '我依照你提供的金額，整理了三種完成速度。'}</p>
          <label>目標金額<input type="number" min="1" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} /></label>
          {editingGoal && <label>目前已存<input type="number" min="0" value={savedAmount} onChange={(event) => setSavedAmount(event.target.value)} /></label>}
          <div className="goal-plan-options">{plans.map((plan) => <button type="button" key={plan.id} className={selectedPlanId === plan.id ? 'is-active' : ''} onClick={() => setSelectedPlanId(plan.id)}><small>{plan.label}</small><strong>{plan.months} 個月</strong><span>每月約 ${money(plan.monthlyContribution)}</span></button>)}</div>
          {allocationPending
            ? <p className="goal-guide__capacity">你還沒設定本月收入，所以這裡先只規劃目標；補上收入後，再確認每月存款是否合適。</p>
            : monthlySavingCapacity > 0 && <p className="goal-guide__capacity">你目前每月預計儲蓄約 ${money(monthlySavingCapacity)}；建立後還能再調整分給每個夢想的比例。</p>}
          {estimateInfo && <p className="goal-guide__notice">目前使用可修改的「{estimateInfo.source}」，尚未連接即時機票或商品行情；正式接上後端後會再更新估算來源。</p>}
          <div className="goal-guide__actions"><button type="button" onClick={() => setStage(editingGoal ? 'name' : 'amount')}>{editingGoal ? '修改名稱' : '再調整'}</button><button type="submit">{editingGoal ? '儲存修改' : `採用${selectedPlan.label}方案`}</button></div>
          {editingGoal && <div className="goal-guide__lifecycle"><p>這個夢想有新的進度嗎？完成後會移到歷史紀錄，之後仍能恢復。</p><div><button type="button" onClick={() => moveGoalToHistory('completed')}><CheckCircle2 size={15} />標為完成</button><button type="button" onClick={() => moveGoalToHistory('archived')}><Archive size={15} />暫時收起</button></div></div>}
        </section>}
      </form>}
    </main>
  );
}
