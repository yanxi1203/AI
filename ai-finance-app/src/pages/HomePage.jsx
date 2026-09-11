import { useEffect, useState } from 'react';
import {
  Barcode, Bell, ChevronRight, Mic, Send, Target, Utensils,
  Bus, BookOpen, CircleDollarSign
} from 'lucide-react';
import FinMascot from '../shared/FinMascot';
import { isPaymentTask, shouldShowRecurringReminder } from '../modules/finance/monthlyPlan';
import { getGoalStatus } from '../modules/goals/goalPlanner';
import { getHomeAssistantInputCopy } from '../modules/goals/goalIntent';

const money = (value) => Math.round(Number(value || 0)).toLocaleString('zh-TW');

const categoryIcon = (category) => {
  if (category === '飲食') return Utensils;
  if (category === '交通') return Bus;
  if (category === '娛樂' || category === '學習') return BookOpen;
  return CircleDollarSign;
};

export default function HomePage({
  summary,
  goals,
  recurring,
  settings,
  finReply,
  pendingConfirmation,
  paymentMatch,
  goalDraft,
  onSendMessage,
  onResolvePending,
  onResolvePaymentMatch,
  onResolveGoalIntent,
  onReminderAction,
  onOpenCarrier,
  onOpenGoals,
  onOpenSettings
}) {
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [homeView, setHomeView] = useState('records');
  const [showNotifications, setShowNotifications] = useState(false);

  const submit = async (question = input) => {
    const text = String(question || '').trim();
    if (!text || isSending) return;
    setInput('');
    setIsSending(true);
    try {
      await onSendMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceMessage('這個瀏覽器目前不支援語音輸入，可以先使用鍵盤輸入。');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.interimResults = false;
    setIsListening(true);
    setVoiceMessage('正在聽你說話…');
    recognition.start();
    recognition.onresult = (event) => {
      setInput(event.results[0][0].transcript);
      setVoiceMessage('已完成語音辨識，送出前可以先確認文字。');
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceMessage(event.error === 'not-allowed'
        ? '沒有取得麥克風權限，請到瀏覽器設定允許後再試一次。'
        : '這次沒有聽清楚，可以再試一次或改用鍵盤。');
    };
    recognition.onend = () => setIsListening(false);
  };

  const dateLabel = new Intl.DateTimeFormat('zh-TW', {
    month: 'long', day: 'numeric', weekday: 'long'
  }).format(new Date());
  const homeSections = settings.homeSections || { reminders: true, recentRecords: true, goals: true };
  const butlerName = settings.name || 'Fin';
  const assistantInputCopy = getHomeAssistantInputCopy(butlerName);
  const recent = summary.recentTransactions.slice(0, 4);
  const visibleGoals = goals.filter((goal) => getGoalStatus(goal) === 'active').slice(0, 2);
  const reminders = recurring.filter((item) => shouldShowRecurringReminder(item)).slice(0, 3);
  const budgetShortfall = Number(settings.allocation?.shortfall || 0);
  const allocationPending = settings.allocation?.status === 'pending-income' || settings.profile?.incomeUnknown === true;
  const noticeLines = [
    budgetShortfall > 0 ? `固定支出仍短缺 $${money(budgetShortfall)}。` : null,
    settings.notifications?.bills && reminders.length ? `還有 ${reminders.length} 件財務待辦。` : null,
    !allocationPending && settings.notifications?.budget && summary.monthRemaining <= summary.monthlyBudget * 0.2 ? '本月可用金額已接近預算下限。' : null,
    settings.notifications?.dailySummary ? `今天目前支出 $${money(summary.todayExpenses)}。` : null
  ].filter(Boolean);

  useEffect(() => {
    if (homeView === 'records' && !homeSections.recentRecords && homeSections.goals) setHomeView('goals');
    if (homeView === 'goals' && !homeSections.goals && homeSections.recentRecords) setHomeView('records');
  }, [homeSections.goals, homeSections.recentRecords, homeView]);

  return (
    <main className="page home-page">
      <header className="home-hero">
        <div className="home-topline">
          <span>{dateLabel}</span>
          <div className="home-actions">
            <button type="button" className="icon-button" onClick={onOpenCarrier} aria-label="顯示電子發票載具">
              <Barcode size={17} />
            </button>
            <button type="button" className="icon-button notification-button" onClick={() => setShowNotifications((current) => !current)} aria-label="通知">
              <Bell size={17} />
              {noticeLines.length > 0 && <i>{noticeLines.length}</i>}
            </button>
          </div>
        </div>
        {showNotifications && <section className="notification-popover"><strong>今日通知</strong>{noticeLines.length ? noticeLines.map((line) => <p key={line}>{line}</p>) : <p>今天沒有開啟中的通知。</p>}<small>提醒內容可以在設定頁調整。</small></section>}

        <div className="home-companion">
          <FinMascot name={butlerName} />
          <div>
            <strong>{butlerName} 在這裡</strong>
            <h1>今天的錢，我幫你一起看著。</h1>
            <p>{allocationPending
              ? '等你補上本月收入，我再幫你算儲蓄和日常預算。'
              : budgetShortfall > 0
              ? `固定支出比收入多 $${money(budgetShortfall)}，我們先重新調整。`
              : summary.monthRemaining >= 0
                ? '照目前速度，這個月還算穩定。'
                : '這個月已經超過預算，我們一起調整。'}</p>
          </div>
        </div>

        <div className="home-balance">
          <span>{allocationPending ? '本月日常預算待設定' : '本月日常預算剩餘'}<small>{allocationPending ? '先補上收入，才不會用 0 元誤判超支。' : `已先扣除儲蓄與固定支出 · 距離月底 ${summary.remainingDays} 天`}</small></span>
          {allocationPending
            ? <button type="button" className="home-balance-setup" onClick={onOpenSettings}>補上收入 <ChevronRight size={14} /></button>
            : <strong>${money(summary.monthRemaining)}</strong>}
        </div>
      </header>

      <section className="home-content">
        <section className="quick-entry" aria-label={assistantInputCopy.regionLabel}>
          <div className="section-heading">
            <h2>{assistantInputCopy.title}</h2>
            <span>{assistantInputCopy.subtitle}</span>
          </div>
          <div className="quick-entry__bar">
            <input
              id="finance-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder={assistantInputCopy.placeholder}
              aria-label={assistantInputCopy.inputLabel}
              autoComplete="off"
              disabled={isSending}
            />
            <button type="button" className={isListening ? 'is-listening' : ''} onClick={startVoice} disabled={isSending} aria-label="使用語音輸入">
              <Mic size={17} />
            </button>
            <button type="button" className="quick-entry__send" onClick={() => submit()} disabled={!input.trim() || isSending} aria-label={assistantInputCopy.sendLabel}>
              <Send size={17} />
            </button>
          </div>
          <div className="finance-quick-questions" aria-label="快速財務問題">
            {[
              '我今天還能花多少？',
              '這個月錢都花去哪了？',
              '下一筆要付什麼？'
            ].map((question) => (
              <button type="button" key={question} onClick={() => submit(question)} disabled={isSending}>
                {question}
              </button>
            ))}
          </div>
          {voiceMessage && <p className="voice-status" aria-live="polite">{voiceMessage}</p>}
          <div className={`fin-result${isSending ? ' is-loading' : ''}`} aria-live="polite" aria-busy={isSending}>
            <i />
            <p><strong>{butlerName}</strong>{isSending ? '正在整理你的財務資料…' : finReply}</p>
          </div>
          {pendingConfirmation?.mode === 'confirmation' && <div className="fin-confirm-actions">
            <button type="button" onClick={() => onResolvePending(true)}>是，幫我記下</button>
            <button type="button" onClick={() => onResolvePending(false)}>不是</button>
          </div>}
          {goalDraft && <div className="fin-confirm-actions goal-intent-actions">
            <button type="button" onClick={() => onResolveGoalIntent('start')}>開始規劃</button>
            <button type="button" onClick={() => onResolveGoalIntent('dismiss')}>暫時不用</button>
          </div>}
          {paymentMatch?.mode === 'choose' && <div className="payment-match-actions">
            {paymentMatch.candidates.map((candidate) => <button type="button" key={candidate.id} onClick={() => onResolvePaymentMatch(candidate.id)}>{candidate.title}</button>)}
            <button type="button" onClick={() => onResolvePaymentMatch(null)}>都不是</button>
          </div>}
          {paymentMatch?.mode === 'matched' && <div className="payment-match-actions"><button type="button" onClick={() => onResolvePaymentMatch(null)}>不是這筆，取消配對</button></div>}
        </section>

        {homeSections.reminders && <section className="home-reminders">
          <div className="section-heading">
            <h2>今天需要留意</h2>
            <span className="count-pill">{reminders.length}</span>
          </div>
          {reminders.map((item, index) => {
            const Icon = index === 0 ? CircleDollarSign : Target;
            const paymentTask = isPaymentTask(item);
            return (
              <article className="reminder-row" key={item.id}>
                <span className={`soft-icon ${index ? 'soft-icon--peach' : ''}`}><Icon size={18} /></span>
                <div><strong>{item.title}</strong><p>${money(item.amount)} · {item.dueDay ? `${item.dueDay} 日到期` : paymentTask ? '待補繳費日' : '固定項目'}</p></div>
                <div className="reminder-actions"><button type="button" onClick={() => onReminderAction(item, 'complete')}>{paymentTask ? '標記已繳' : '記下'}</button><button type="button" onClick={() => onReminderAction(item, 'skip')}>今天略過</button></div>
              </article>
            );
          })}
          {!reminders.length && <p className="empty-copy">今天的財務待辦都處理好了。</p>}
        </section>}
      </section>

      {(homeSections.recentRecords || homeSections.goals) && <div className="home-tabs" role="tablist" aria-label="首頁內容">
        {homeSections.recentRecords && <button type="button" className={homeView === 'records' ? 'is-active' : ''} onClick={() => setHomeView('records')}>最近紀錄</button>}
        {homeSections.goals && <button type="button" className={homeView === 'goals' ? 'is-active' : ''} onClick={() => setHomeView('goals')}>夢想目標</button>}
      </div>}

      {(homeSections.recentRecords || homeSections.goals) && <section className="home-detail">
        {homeView === 'records' ? (
          recent.length ? recent.map((transaction) => {
            const Icon = categoryIcon(transaction.category);
            return (
              <article className="transaction-row" key={transaction.id}>
                <span className="soft-icon"><Icon size={17} /></span>
                <div><strong>{transaction.title}</strong><small>{transaction.date === summary.todayKey ? '今天' : transaction.date} · {transaction.category}</small></div>
                <b className={transaction.type === 'income' ? 'is-income' : ''}>{transaction.type === 'income' ? '+' : '−'} ${money(transaction.amount)}</b>
              </article>
            );
          }) : <p className="empty-copy">還沒有紀錄，先跟 {butlerName} 說一筆花費吧。</p>
        ) : (
          <>
            <div className="detail-heading"><h2>正在進行的目標</h2><button type="button" onClick={onOpenGoals}>查看全部 <ChevronRight size={14} /></button></div>
            {visibleGoals.map((goal) => {
              const percent = goal.targetAmount ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
              return (
                <article className="goal-preview" key={goal.id}>
                  <span className="soft-icon soft-icon--peach"><Target size={17} /></span>
                  <div>
                    <div><strong>{goal.title}</strong><span>{goal.targetAmount ? `${percent}%` : '待估算'}</span></div>
                    <p>{goal.targetAmount ? `$${money(goal.savedAmount)}／$${money(goal.targetAmount)}` : '尚未設定目標金額'}</p>
                    <div className="progress-track"><i style={{ width: `${percent}%` }} /></div>
                  </div>
                </article>
              );
            })}
            {!visibleGoals.length && <div className="home-empty-goals">
              <span className="soft-icon soft-icon--peach"><Target size={18} /></span>
              <div><strong>還沒有夢想目標</strong><p>先寫下想完成的事，金額不知道也沒關係。</p></div>
              <button type="button" onClick={onOpenGoals}>建立第一個夢想</button>
            </div>}
          </>
        )}
      </section>}
    </main>
  );
}
