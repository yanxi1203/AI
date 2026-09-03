import { useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, ChevronRight, Pencil, Plus, RotateCcw, Target, Trash2 } from 'lucide-react';
import PageHeader from '../shared/PageHeader';
import GoalGuide from './GoalGuide';
import { changeGoalStatus, groupGoalsByStatus } from '../modules/goals/goalPlanner';

const money = (value) => Math.round(Number(value || 0)).toLocaleString('zh-TW');

export default function GoalsPage({ goals = [], butlerName = 'Fin', monthlySavingCapacity = 0, allocationStatus = 'ready', goalDraft = null, shouldOpenGoalDraft = false, onDiscardGoalDraft, onBack, onAddGoal, onUpdateGoal, onDeleteGoal }) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const editingGoal = goals.find((goal) => goal.id === editingGoalId) || null;
  const goalGroups = useMemo(() => groupGoalsByStatus(goals), [goals]);
  const historyGoals = useMemo(() => [...goalGroups.completed, ...goalGroups.archived].sort((left, right) => {
    const leftDate = left.completedAt || left.archivedAt || '';
    const rightDate = right.completedAt || right.archivedAt || '';
    return rightDate.localeCompare(leftDate);
  }), [goalGroups.archived, goalGroups.completed]);

  const openGuide = () => { setEditingGoalId(null); setIsAdding(true); };
  const openEdit = (goal) => { setEditingGoalId(goal.id); setIsAdding(true); };
  const closeGuide = () => {
    if (!editingGoal && shouldOpenGoalDraft) onDiscardGoalDraft?.();
    setIsAdding(false);
    setEditingGoalId(null);
  };

  useEffect(() => {
    if (!shouldOpenGoalDraft || !goalDraft) return;
    setEditingGoalId(null);
    setIsAdding(true);
  }, [goalDraft, shouldOpenGoalDraft]);
  const deleteGoal = (goal) => {
    if (!window.confirm(`確定永久刪除「${goal.title}」嗎？這個動作無法復原。`)) return;
    onDeleteGoal?.(goal.id);
  };

  return <main className="page subpage goals-page">
    <PageHeader eyebrow="夢想規劃" title="我的夢想目標" onBack={onBack} action={<button type="button" className="icon-button" onClick={openGuide} aria-label="新增夢想目標"><Plus size={19} /></button>} />
    <section className="goals-intro"><div><h2>慢慢完成想做的事</h2><strong>進行中 {goalGroups.active.length} 個</strong></div><p>知道金額可以直接建立；不確定時，再請 {butlerName} 依條件整理參考區間。</p></section>
    <section className="goals-list">
      {goalGroups.active.map((goal) => {
        const percent = goal.targetAmount ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
        const remaining = goal.targetAmount ? Math.max(0, goal.targetAmount - goal.savedAmount) : null;
        return <article className="goal-card" key={goal.id}><span className="soft-icon soft-icon--peach"><Target size={18} /></span><div><div><strong>{goal.title}</strong><span>{goal.targetAmount ? `${percent}%` : '待估算'}</span></div><p>{goal.targetAmount ? `$${money(goal.savedAmount)}／$${money(goal.targetAmount)}` : '尚未設定目標金額'}</p><div className="progress-track"><i style={{ width: `${percent}%` }} /></div>{remaining !== null && <small>{goal.planMonths ? `${goal.planMonths} 個月方案` : '平衡方案'}：每月存 ${money(goal.monthlyContribution || Math.ceil(remaining / 12 / 100) * 100)}</small>}</div><button type="button" className="goal-card__edit" onClick={() => openEdit(goal)} aria-label={`調整${goal.title}`}><Pencil size={15} /><span>調整</span></button></article>;
      })}
      {!goalGroups.active.length && <div className="goals-empty"><Target size={20} /><div><strong>目前沒有進行中的目標</strong><p>{historyGoals.length ? '可以建立新的夢想，或從下方歷史紀錄恢復。' : '寫下現在最想完成的一件事就可以開始。'}</p></div></div>}
    </section>
    <button type="button" className="primary-soft-button" onClick={openGuide}><Plus size={18} />建立新的夢想目標</button>

    {historyGoals.length > 0 && <section className="goal-history-section"><button type="button" className={`goal-history-toggle ${showHistory ? 'is-open' : ''}`} onClick={() => setShowHistory((current) => !current)} aria-expanded={showHistory}><span>已完成與封存</span><small>{historyGoals.length} 個</small><ChevronRight size={16} /></button>{showHistory && <div className="goal-history-list">{historyGoals.map((goal) => {
      const completed = goal.status === 'completed';
      return <article key={goal.id}><span className={`goal-history-status ${completed ? 'is-completed' : ''}`}>{completed ? <CheckCircle2 size={15} /> : <Archive size={15} />}</span><div><strong>{goal.title}</strong><small>{completed ? '已完成' : '已封存'}{goal.targetAmount ? ` · 目標 $${money(goal.targetAmount)}` : ''}</small></div><div className="goal-history-actions"><button type="button" onClick={() => onUpdateGoal(changeGoalStatus(goal, 'active'))}><RotateCcw size={14} />恢復</button><button type="button" onClick={() => deleteGoal(goal)}><Trash2 size={14} />刪除</button></div></article>;
    })}</div>}</section>}

    {isAdding && <GoalGuide key={editingGoal?.id || (shouldOpenGoalDraft ? `draft-${goalDraft?.sourceText}` : 'new-goal')} butlerName={butlerName} editingGoal={editingGoal} initialDraft={!editingGoal && shouldOpenGoalDraft ? goalDraft : null} monthlySavingCapacity={monthlySavingCapacity} allocationStatus={allocationStatus} onAddGoal={onAddGoal} onUpdateGoal={onUpdateGoal} onClose={closeGuide} />}
  </main>;
}
