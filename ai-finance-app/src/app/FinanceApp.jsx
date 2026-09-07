import { useEffect, useMemo, useRef, useState } from 'react';
import BottomNavigation from '../shared/BottomNavigation';
import HomePage from '../pages/HomePage';
import LedgerPage from '../pages/LedgerPage';
import AnalysisPage from '../pages/AnalysisPage';
import SettingsPage from '../pages/SettingsPage';
import GoalsPage from '../pages/GoalsPage';
import CarrierPage from '../pages/CarrierPage';
import OnboardingFlow from '../pages/OnboardingFlow';
import AuthLoadingScreen from '../pages/AuthLoadingScreen';
import { createFinanceSummary } from '../modules/finance/financeSummary';
import {
  createFinancialSetup,
  findPaymentTaskMatches,
  getRecurringCycleKey,
  isPaymentTask,
  syncFixedItemsToPaymentTasks
} from '../modules/finance/monthlyPlan';
import { processFinanceMessage } from '../modules/transactions/transactionAssistant';
import {
  GOAL_INTENT_REPLY,
  createGoalDraftFromMessage,
  resolveGoalIntentAction
} from '../modules/goals/goalIntent';
import { generateButlerChatReply } from '../utils/butlerEngine';
import { clearAppState, createAppSnapshot, loadAppState, saveAppState } from '../modules/persistence/appStateClient';
import { sendFinanceMessage } from '../modules/persistence/financeAssistantClient';
import { createLatestSnapshotSaver } from '../modules/persistence/latestSnapshotSaver';
import { createUserStorage, normalizeSettings } from '../utils/storage';
import { getLocalDateKey } from '../utils/date';

function plainButlerReply(reply) {
  return reply.replace(/^.*?：「/, '').replace(/」$/, '');
}

function paymentTasksToFixedItems(items) {
  return (Array.isArray(items) ? items : []).filter(isPaymentTask).map((item) => ({
    id: item.planFixedItemId || item.id,
    type: item.category === '交通' ? '交通通勤' : '固定支出',
    title: item.title,
    amount: Number(item.amount || 0),
    source: item.planFixedItemId ? 'onboarding' : 'settings'
  }));
}

export default function FinanceApp({ userId, accessToken }) {
  const userStorage = useMemo(() => createUserStorage(userId), [userId]);
  const [activePage, setActivePage] = useState('home');
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => userStorage.getOnboardingCompleted());
  const [onboardingSession] = useState(0);
  const [returnPage, setReturnPage] = useState('home');
  const [theme, setTheme] = useState(() => userStorage.getTheme());
  const [monthlyBudget, setMonthlyBudget] = useState(() => userStorage.getBudget());
  const [settings, setSettings] = useState(() => userStorage.getSettings());
  const [transactions, setTransactions] = useState(() => userStorage.getTransactions());
  const [goals, setGoals] = useState(() => userStorage.getGoals());
  const [barcode, setBarcode] = useState(() => userStorage.getBarcode());
  const [finReply, setFinReply] = useState('可以告訴我今天花了什麼、收到多少收入，或你想完成的夢想。');
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [paymentMatch, setPaymentMatch] = useState(null);
  const [goalDraft, setGoalDraft] = useState(null);
  const [goalGuideRequested, setGoalGuideRequested] = useState(false);
  const [recurring, setRecurring] = useState(() => userStorage.getRecurring());
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [uiNotice, setUiNotice] = useState(null);
  const [persistenceConflict, setPersistenceConflict] = useState(false);
  const summary = useMemo(
    () => createFinanceSummary({ transactions, monthlyBudget, paymentTasks: recurring }),
    [transactions, monthlyBudget, recurring]
  );
  const appSnapshot = useMemo(() => createAppSnapshot({
    monthlyBudget,
    settings,
    transactions,
    goals,
    recurring,
    barcode,
    theme,
    onboardingCompleted,
    pendingConfirmation
  }), [barcode, goals, monthlyBudget, onboardingCompleted, pendingConfirmation, recurring, settings, theme, transactions]);
  const initialSnapshot = useRef(appSnapshot);
  const revisionRef = useRef(0);
  const saveLatestSnapshot = useMemo(() => createLatestSnapshotSaver(async (snapshot) => {
    const saved = await saveAppState(snapshot, {
      accessToken,
      expectedRevision: revisionRef.current
    });
    revisionRef.current = saved.revision;
    return saved;
  }), [accessToken]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const hydrateFromBackend = async () => {
      try {
        const applyRemoteState = (remoteState) => {
          setMonthlyBudget(Number(remoteState.monthlyBudget || 0));
          setSettings(normalizeSettings(remoteState.settings));
          setTransactions(Array.isArray(remoteState.transactions) ? remoteState.transactions : []);
          setGoals(Array.isArray(remoteState.goals) ? remoteState.goals : []);
          setRecurring(Array.isArray(remoteState.recurring) ? remoteState.recurring : []);
          setBarcode(typeof remoteState.barcode === 'string' ? remoteState.barcode : '');
          setTheme(['system', 'light', 'dark'].includes(remoteState.theme) ? remoteState.theme : 'system');
          setPendingConfirmation(remoteState.assistant?.pendingConfirmation || null);
          setOnboardingCompleted(remoteState.onboardingCompleted === true);
          userStorage.setOnboardingCompleted(remoteState.onboardingCompleted === true);
        };

        const remote = await loadAppState({ accessToken, signal: controller.signal });
        if (cancelled) return;
        revisionRef.current = Number(remote.revision || 0);

        if (remote.state) {
          applyRemoteState(remote.state);
        } else {
          try {
            await saveLatestSnapshot(initialSnapshot.current);
          } catch (error) {
            if (error?.status !== 409) throw error;
            const latest = await loadAppState({ accessToken, signal: controller.signal });
            if (cancelled) return;
            revisionRef.current = Number(latest.revision || 0);
            if (latest.state) applyRemoteState(latest.state);
          }
        }
        if (!cancelled) setBackendStatus('connected');
      } catch (error) {
        if (!cancelled && error?.name !== 'AbortError') setBackendStatus('offline');
      } finally {
        if (!cancelled) setPersistenceReady(true);
      }
    };

    hydrateFromBackend();
    return () => {
      cancelled = true;
      controller.abort();
      saveLatestSnapshot.cancel(new Error('使用者已切換'));
    };
  }, [accessToken, saveLatestSnapshot, userStorage]);

  useEffect(() => {
    if (!persistenceReady || persistenceConflict) return undefined;
    const timer = setTimeout(() => {
      saveLatestSnapshot(appSnapshot)
        .then(() => setBackendStatus('connected'))
        .catch((error) => {
          if (error?.status === 409) {
            setBackendStatus('conflict');
            setPersistenceConflict(true);
            return;
          }
          if (!/已切換|已取消/.test(error?.message || '')) setBackendStatus('offline');
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [appSnapshot, persistenceConflict, persistenceReady, saveLatestSnapshot]);


  useEffect(() => userStorage.setTransactions(transactions), [transactions, userStorage]);
  useEffect(() => userStorage.setGoals(goals), [goals, userStorage]);
  useEffect(() => userStorage.setBudget(monthlyBudget), [monthlyBudget, userStorage]);
  useEffect(() => userStorage.setSettings(settings), [settings, userStorage]);
  useEffect(() => userStorage.setBarcode(barcode), [barcode, userStorage]);
  useEffect(() => userStorage.setRecurring(recurring), [recurring, userStorage]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    userStorage.setTheme(theme);
    media.addEventListener?.('change', apply);
    return () => media.removeEventListener?.('change', apply);
  }, [theme, userStorage]);

  useEffect(() => {
    const textSize = settings.display?.textSize || 'system';
    document.documentElement.dataset.textSize = textSize;
  }, [settings.display?.textSize]);

  useEffect(() => {
    if (!uiNotice) return undefined;
    const timer = setTimeout(() => setUiNotice(null), 2400);
    return () => clearTimeout(timer);
  }, [uiNotice]);

  const showNotice = (message) => {
    setUiNotice({ id: Date.now(), message });
  };

  const navigate = (page) => {
    setActivePage(page);
    document.querySelector('.app-scroll')?.scrollTo({ top: 0 });
  };

  const openSubpage = (page, from = 'home') => {
    setReturnPage(from);
    navigate(page);
  };

  const handleSendMessage = async (text) => {
    let result;
    try {
      const response = await sendFinanceMessage(
        { text, transactions, pendingConfirmation },
        { accessToken }
      );
      result = response.result;
      revisionRef.current = Number(response.revision ?? revisionRef.current);
      setBackendStatus('connected');
    } catch (error) {
      if (error?.status === 401) {
        setBackendStatus('unauthorized');
        setFinReply('登入狀態已失效，請重新整理後再試一次。');
        return;
      }
      result = processFinanceMessage({ text, transactions, pendingConfirmation });
      setBackendStatus('offline');
    }
    if (!(result.kind === 'chat' && result.parsed?.type === 'goal')) {
      setGoalDraft(null);
      setGoalGuideRequested(false);
    }
    if (result.kind === 'transaction_added' || result.kind === 'transactions_added' || result.kind === 'transaction_corrected') {
      let nextTransactions = result.transactions;
      let nextReply = result.reply;
      const addedTransactions = result.addedTransactions || (result.transaction ? [result.transaction] : []);
      const matchCandidate = addedTransactions.length === 1 ? addedTransactions[0] : null;
      const matches = settings.automation?.billMatching !== false && matchCandidate
        ? findPaymentTaskMatches(matchCandidate, recurring)
        : [];

      if (matches.length === 1 && (settings.automation?.exactMatchAction || 'auto') === 'auto') {
        const matchedTask = matches[0];
        const now = new Date();
        nextTransactions = nextTransactions.map((transaction) => transaction.id === matchCandidate.id
          ? { ...transaction, recurringId: matchedTask.id, isFixedExpense: true }
          : transaction);
        setRecurring((current) => current.map((item) => item.id === matchedTask.id ? {
          ...item,
          lastCompletedDate: getLocalDateKey(now),
          lastCompletedCycle: getRecurringCycleKey(item, now),
          skippedOn: null
        } : item));
        setPaymentMatch({ mode: 'matched', transactionId: matchCandidate.id, recurringId: matchedTask.id, title: matchedTask.title });
        nextReply += ` 這筆也與「${matchedTask.title}」相符，已標記為本月已繳。`;
      } else if (matches.length) {
        setPaymentMatch({
          mode: 'choose',
          transactionId: matchCandidate.id,
          candidates: matches.map((item) => ({ id: item.id, title: item.title }))
        });
        nextReply += ' 我找到可能對應的固定帳單，請選擇是哪一筆。';
      } else {
        setPaymentMatch(null);
      }

      setTransactions(nextTransactions);
      setFinReply(nextReply);
      setPendingConfirmation(null);
      if (result.kind === 'transaction_corrected') {
        showNotice(`已修改「${result.transaction?.title || '這筆帳目'}」`);
      } else if (addedTransactions.length > 1) {
        showNotice(`已記下 ${addedTransactions.length} 筆帳目`);
      } else if (addedTransactions[0]) {
        showNotice(`已記下「${addedTransactions[0].title}」$${Number(addedTransactions[0].amount).toLocaleString('zh-TW')}`);
      }
      return;
    }
    if (result.kind === 'confirmation_required') {
      setPendingConfirmation(result.pendingConfirmation);
      setFinReply(result.reply);
      return;
    }
    if (result.kind === 'confirmation_cancelled') {
      setPendingConfirmation(null);
      setFinReply(result.reply);
      return;
    }
    if (result.kind === 'clarification') {
      setPendingConfirmation(result.pendingConfirmation || null);
      setFinReply(result.reply);
      return;
    }
    if (result.kind === 'chat' && result.parsed?.type === 'goal') {
      setPendingConfirmation(null);
      setGoalDraft(createGoalDraftFromMessage({ sourceText: text, parsed: result.parsed }));
      setGoalGuideRequested(false);
      setFinReply(GOAL_INTENT_REPLY);
      return;
    }
    if (result.kind === 'chat') {
      setPendingConfirmation(null);
      setFinReply(plainButlerReply(generateButlerChatReply(text, {
        monthlyBudget,
        currentMonthExpenses: summary.currentExpenses,
        monthRemaining: summary.monthRemaining,
        todaySpent: summary.todayExpenses,
        todayAvailable: summary.todayAvailable
      }, settings)));
    }
  };

  const handleGoalIntent = (action) => {
    const transition = resolveGoalIntentAction(action, goalDraft);
    setGoalDraft(transition.goalDraft);
    setGoalGuideRequested(transition.openGuide);
    if (transition.nextPage) {
      openSubpage(transition.nextPage, 'home');
      return;
    }
    setFinReply('好的，想規劃時再告訴我就可以。');
  };

  const resolvePaymentMatch = (recurringId) => {
    if (!paymentMatch) return;
    if (!recurringId) {
      if (paymentMatch.mode === 'matched') {
        setTransactions((current) => current.map((transaction) => {
          if (transaction.id !== paymentMatch.transactionId) return transaction;
          const { recurringId: _recurringId, isFixedExpense: _isFixedExpense, ...rest } = transaction;
          return rest;
        }));
        setRecurring((current) => current.map((item) => item.id === paymentMatch.recurringId
          ? { ...item, lastCompletedDate: null, lastCompletedCycle: null }
          : item));
        setFinReply(`好的，已取消與「${paymentMatch.title}」的繳費配對，原本的帳目仍保留。`);
      } else {
        setFinReply('好的，這筆不對應任何固定帳單，原本的帳目仍保留。');
      }
      setPaymentMatch(null);
      return;
    }

    const matchedTask = recurring.find((item) => item.id === recurringId);
    if (!matchedTask) return;
    const now = new Date();
    setTransactions((current) => current.map((transaction) => transaction.id === paymentMatch.transactionId
      ? { ...transaction, recurringId, isFixedExpense: true }
      : transaction));
    setRecurring((current) => current.map((item) => item.id === recurringId ? {
      ...item,
      lastCompletedDate: getLocalDateKey(now),
      lastCompletedCycle: getRecurringCycleKey(item, now),
      skippedOn: null
    } : item));
    setFinReply(`已將這筆帳目配對到「${matchedTask.title}」，並標記為本月已繳。`);
    setPaymentMatch(null);
  };

  const editTransaction = (transactionId, changes) => {
    const original = transactions.find((item) => item.id === transactionId);
    const unlinkPayment = original?.recurringId && (
      changes.type !== original.type
      || Number(changes.amount) !== Number(original.amount)
      || changes.title.trim() !== original.title
    );
    setTransactions((current) => current.map((item) => {
      if (item.id !== transactionId) return item;
      const updated = {
        ...item,
        ...changes,
        title: changes.title.trim(),
        amount: Number(changes.amount),
        updatedAt: new Date().toISOString()
      };
      if (!unlinkPayment) return updated;
      const { recurringId: _recurringId, isFixedExpense: _isFixedExpense, ...unlinked } = updated;
      return unlinked;
    }));
    if (unlinkPayment) {
      setRecurring((current) => current.map((item) => item.id === original.recurringId
        ? { ...item, lastCompletedDate: null, lastCompletedCycle: null }
        : item));
    }
    showNotice(`已儲存「${changes.title.trim()}」的修改`);
  };

  const deleteTransaction = (transactionId) => {
    const transaction = transactions.find((item) => item.id === transactionId);
    setTransactions((current) => current.filter((item) => item.id !== transactionId));
    showNotice(transaction ? `已刪除「${transaction.title}」` : '已刪除這筆帳目');
  };

  const addGoal = (goal) => {
    setGoals((current) => [...current, goal]);
    setGoalDraft(null);
    setGoalGuideRequested(false);
    showNotice(`已建立「${goal.title}」`);
  };

  const updateGoal = (updatedGoal) => {
    setGoals((current) => current.map((goal) => goal.id === updatedGoal.id ? updatedGoal : goal));
    showNotice(`已更新「${updatedGoal.title}」`);
  };

  const deleteGoal = (goalId) => {
    const goal = goals.find((item) => item.id === goalId);
    setGoals((current) => current.filter((item) => item.id !== goalId));
    showNotice(goal ? `已刪除「${goal.title}」` : '已刪除這個夢想目標');
  };

  const handleReminderAction = (item, action) => {
    const today = getLocalDateKey();
    if (action === 'reopen') {
      setTransactions((current) => current.filter((transaction) => !(
        transaction.recurringId === item.id && transaction.source === 'payment_task'
      )));
      setRecurring((current) => current.map((entry) => entry.id === item.id ? {
        ...entry,
        lastCompletedDate: null,
        lastCompletedCycle: null,
        skippedOn: null
      } : entry));
      setFinReply(`已把「${item.title}」改回本月待繳；如果先前是由這個提醒建立的帳目，也已一起移除。`);
      showNotice(`已把「${item.title}」改回待繳`);
      return;
    }
    if (action === 'skip') {
      setRecurring((current) => current.map((entry) => entry.id === item.id ? { ...entry, skippedOn: today } : entry));
      setFinReply(`好的，今天先略過「${item.title}」，不會產生支出。`);
      showNotice(`今天已略過「${item.title}」`);
      return;
    }
    const creditCardSettlement = /信用卡/.test(item.title);
    const alreadyRecorded = transactions.some((transaction) =>
      transaction.date === today && transaction.recurringId === item.id
    );
    if (!alreadyRecorded && !creditCardSettlement) {
      setTransactions((current) => [{
        id: `tx_rec_${Date.now()}`,
        type: 'expense',
        title: item.title,
        amount: Number(item.amount),
        category: item.category,
        emotion: '日常剛需 🏠',
        date: today,
        recurringId: item.id,
        isFixedExpense: isPaymentTask(item),
        source: 'payment_task',
        createdAt: new Date().toISOString()
      }, ...current]);
    }
    setRecurring((current) => current.map((entry) => entry.id === item.id ? {
      ...entry,
      lastCompletedDate: today,
      lastCompletedCycle: getRecurringCycleKey(entry),
      skippedOn: null
    } : entry));
    setFinReply(creditCardSettlement
      ? `已把「${item.title}」標記為本月已繳；這是還款，不會再重複算成一次消費。APP 不會代為付款。`
      : `已把「${item.title}」標記為本月已繳並記入帳本。APP 不會代為付款。`);
    showNotice(creditCardSettlement ? `已標記「${item.title}」為已繳` : `已記下並完成「${item.title}」`);
  };

  const resetData = async () => {
    if (!window.confirm('確定要清除所有帳本、目標與設定嗎？這個動作無法復原。')) return;
    try {
      await clearAppState({ accessToken });
    } catch {
      window.alert('後端目前未連線；已清除此瀏覽器中目前使用者的資料，但伺服器資料尚未清除。');
    }
    userStorage.clear();
    window.location.reload();
  };

  const completeOnboarding = ({ settings: nextSettings, monthlyBudget: nextBudget }) => {
    const nextRecurring = syncFixedItemsToPaymentTasks(nextSettings.profile?.fixedItems, recurring);
    setSettings(nextSettings);
    setMonthlyBudget(nextBudget);
    setRecurring(nextRecurring);
    setOnboardingCompleted(true);
    userStorage.setOnboardingCompleted(true);
    setActivePage('home');
  };

  const handleRecurringChange = (nextRecurring) => {
    setRecurring(nextRecurring);
    const incomeAmount = Number(settings.profile?.monthlyIncome || 0);
    const fixedItems = paymentTasksToFixedItems(nextRecurring);
    const financialSetup = createFinancialSetup({
      incomeAmount,
      incomeKnown: settings.profile?.incomeUnknown !== true && incomeAmount > 0,
      fixedItems,
      desiredSavings: settings.profile?.desiredSavings
    });
    setMonthlyBudget(financialSetup.monthlyBudget);
    setSettings((current) => ({
      ...current,
      profile: {
        ...current.profile,
        ...financialSetup.profile
      },
      allocation: financialSetup.allocation
    }));
  };

  const handleFinancialPlanChange = ({ monthlyIncome, incomeUnknown, desiredSavings }) => {
    const financialSetup = createFinancialSetup({
      incomeAmount: monthlyIncome,
      incomeKnown: !incomeUnknown,
      fixedItems: paymentTasksToFixedItems(recurring),
      desiredSavings
    });
    setMonthlyBudget(financialSetup.monthlyBudget);
    setSettings((current) => ({
      ...current,
      profile: { ...current.profile, ...financialSetup.profile },
      allocation: financialSetup.allocation
    }));
    showNotice(incomeUnknown ? '已保留為待估算' : '已重新計算本月分配');
  };

  const handleBudgetChange = (value) => {
    const flexible = Math.max(0, Number(value || 0));
    setMonthlyBudget(flexible);
    setSettings((current) => ({
      ...current,
      allocation: {
        ...current.allocation,
        flexible,
        calculatedAt: new Date().toISOString()
      }
    }));
  };

  const restartOnboarding = () => {
    setOnboardingCompleted(false);
    userStorage.setOnboardingCompleted(false);
    document.querySelector('.app-scroll')?.scrollTo({ top: 0 });
  };

  if (!persistenceReady) return <AuthLoadingScreen />;

  if (!onboardingCompleted) {
    return (
      <div className="app-stage">
        <section className="phone-shell onboarding-shell" aria-label="Fin 首次使用設定">
          <div className="ios-status" aria-hidden="true"><span>9:41</span><i /><span>●●●</span></div>
          <div className="app-scroll onboarding-scroll">
            <OnboardingFlow key={onboardingSession} settings={settings} onComplete={completeOnboarding} />
          </div>
        </section>
      </div>
    );
  }

  const navPage = ['goals', 'carrier'].includes(activePage) ? returnPage : activePage;

  return (
    <div className="app-stage">
      <section className="phone-shell" aria-label="AI 財務管家">
        <div className="ios-status" aria-hidden="true"><span>9:41</span><i /><span>●●●</span></div>
        <div className="app-scroll">
          {activePage === 'home' && <HomePage summary={summary} goals={goals} recurring={recurring} settings={settings} finReply={finReply} pendingConfirmation={pendingConfirmation} paymentMatch={paymentMatch} goalDraft={goalDraft} onSendMessage={handleSendMessage} onResolvePending={(confirmed) => handleSendMessage(confirmed ? '是' : '不是')} onResolvePaymentMatch={resolvePaymentMatch} onResolveGoalIntent={handleGoalIntent} onReminderAction={handleReminderAction} onOpenCarrier={() => openSubpage('carrier', 'home')} onOpenGoals={() => openSubpage('goals', 'home')} onOpenSettings={() => navigate('settings')} />}
          {activePage === 'ledger' && <LedgerPage summary={summary} butlerName={settings.name} categories={settings.categories} allocationStatus={settings.allocation?.status} onDeleteTransaction={deleteTransaction} onEditTransaction={editTransaction} />}
          {activePage === 'analysis' && <AnalysisPage summary={summary} butlerName={settings.name} plannedSavings={settings.allocation?.savings || 0} allocationStatus={settings.allocation?.status} />}
          {activePage === 'settings' && <SettingsPage theme={theme} settings={settings} recurring={recurring} monthlyBudget={monthlyBudget} transactions={transactions} backendStatus={backendStatus} onThemeChange={setTheme} onSettingsChange={setSettings} onRecurringChange={handleRecurringChange} onBudgetChange={handleBudgetChange} onFinancialPlanChange={handleFinancialPlanChange} onOpenGoals={() => openSubpage('goals', 'settings')} onOpenCarrier={() => openSubpage('carrier', 'settings')} onPaymentAction={handleReminderAction} onRestartOnboarding={restartOnboarding} showOnboardingRestart={import.meta.env.DEV} onResetData={resetData} />}
          {activePage === 'goals' && <GoalsPage goals={goals} butlerName={settings.name} monthlySavingCapacity={settings.allocation?.savings || 0} allocationStatus={settings.allocation?.status} goalDraft={goalDraft} shouldOpenGoalDraft={goalGuideRequested} onDiscardGoalDraft={() => { setGoalDraft(null); setGoalGuideRequested(false); }} onBack={() => navigate(returnPage)} onAddGoal={addGoal} onUpdateGoal={updateGoal} onDeleteGoal={deleteGoal} />}
          {activePage === 'carrier' && <CarrierPage barcode={barcode} onBack={() => navigate(returnPage)} onSaveBarcode={setBarcode} />}
        </div>
        {uiNotice && <div className="app-toast" role="status" aria-live="polite" key={uiNotice.id}>{uiNotice.message}</div>}
        {persistenceConflict && (
          <div className="persistence-conflict" role="alert">
            <span>資料已在其他裝置更新，請重新載入最新資料。</span>
            <button type="button" onClick={() => window.location.reload()}>重新載入</button>
          </div>
        )}
        <BottomNavigation activePage={navPage} onNavigate={navigate} />
      </section>
    </div>
  );
}
