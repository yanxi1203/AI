import { useEffect, useState } from 'react';
import {
  Barcode, Bell, Check, ChevronLeft, ChevronRight, Database, Download, Palette, Pencil, Plus, Repeat2,
  LogOut, RotateCcw, ShieldCheck, Tags, Target, Trash2, UserRound, Wallet, X
} from 'lucide-react';
import { exportTransactionsToCSV } from '../utils/csvExporter';
import { createPaymentTask, isPaymentTask, isRecurringCompleted } from '../modules/finance/monthlyPlan';

const PANEL_TITLES = {
  allocation: '收入與每月分配',
  home: '首頁顯示內容',
  notifications: '通知與提醒',
  categories: '記帳分類',
  recurring: '固定支出與繳費日',
  automation: '帳務自動化',
  butler: 'Fin 的名稱與說話方式',
  data: '帳本與分類',
  export: '資料備份與匯出',
  privacy: '隱私與使用說明'
};

export default function SettingsPage({
  theme, settings, recurring = [], monthlyBudget, transactions, backendStatus = 'offline',
  onThemeChange, onSettingsChange, onRecurringChange, onBudgetChange, onFinancialPlanChange,
  onOpenGoals, onOpenCarrier, onPaymentAction, onRestartOnboarding, showOnboardingRestart = false, onResetData,
  isAnonymous = false, userEmail = '', onSignOut
}) {
  const [activePanel, setActivePanel] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [recurringDraft, setRecurringDraft] = useState({ title: '', amount: '', dueDay: '', category: '固定支出' });
  const [recurringEditDraft, setRecurringEditDraft] = useState(null);
  const [allocationSaved, setAllocationSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutMessage, setSignOutMessage] = useState('');
  const [allocationDraft, setAllocationDraft] = useState(() => ({
    monthlyIncome: String(settings.profile?.monthlyIncome || ''),
    incomeUnknown: settings.profile?.incomeUnknown === true,
    desiredSavings: String(settings.profile?.desiredSavings || '')
  }));
  const butlerName = settings.name || 'Fin';
  const allocationPending = settings.allocation?.status === 'pending-income' || settings.profile?.incomeUnknown === true;
  const persistenceLabel = backendStatus === 'connected'
    ? '已同步至你的 FinMate 帳號'
    : backendStatus === 'connecting'
      ? '正在保存資料'
      : '目前只暫存在這個瀏覽器';
  const panelTitle = activePanel === 'butler' ? butlerName + ' 的名稱與說話方式' : PANEL_TITLES[activePanel];

  useEffect(() => {
    setAllocationDraft({
      monthlyIncome: String(settings.profile?.monthlyIncome || ''),
      incomeUnknown: settings.profile?.incomeUnknown === true,
      desiredSavings: String(settings.profile?.desiredSavings || '')
    });
  }, [settings.profile?.desiredSavings, settings.profile?.incomeUnknown, settings.profile?.monthlyIncome]);

  const updateNestedSetting = (group, key, value) => {
    onSettingsChange({ ...settings, [group]: { ...settings[group], [key]: value } });
  };

  const openPanel = (panel) => {
    setActivePanel(panel);
    document.querySelector('.app-scroll')?.scrollTo({ top: 0 });
  };

  const addCategory = (event) => {
    event.preventDefault();
    const category = newCategory.trim();
    if (!category || settings.categories.includes(category)) return;
    onSettingsChange({ ...settings, categories: [...settings.categories, category] });
    setNewCategory('');
  };

  const removeCategory = (category) => {
    if (settings.categories.length <= 1) return;
    onSettingsChange({ ...settings, categories: settings.categories.filter((item) => item !== category) });
  };

  const addRecurring = (event) => {
    event.preventDefault();
    let paymentTask;
    try {
      paymentTask = createPaymentTask({ id: `payment_${Date.now()}`, ...recurringDraft });
    } catch {
      return;
    }
    onRecurringChange([...recurring, paymentTask]);
    setRecurringDraft({ title: '', amount: '', dueDay: '', category: '固定支出' });
  };

  const startRecurringEdit = (item) => setRecurringEditDraft({
    id: item.id,
    title: item.title,
    amount: String(item.amount || ''),
    dueDay: item.dueDay ? String(item.dueDay) : '',
    category: item.category || '固定支出'
  });

  const saveRecurringEdit = (event) => {
    event.preventDefault();
    if (!recurringEditDraft) return;
    let updated;
    try {
      updated = createPaymentTask(recurringEditDraft);
    } catch {
      return;
    }
    onRecurringChange(recurring.map((item) => item.id === updated.id
      ? { ...item, ...updated, enabled: item.enabled !== false }
      : item));
    setRecurringEditDraft(null);
  };

  const saveAllocation = (event) => {
    event.preventDefault();
    if (!allocationDraft.incomeUnknown && Number(allocationDraft.monthlyIncome) <= 0) return;
    onFinancialPlanChange({
      monthlyIncome: allocationDraft.monthlyIncome,
      incomeUnknown: allocationDraft.incomeUnknown,
      desiredSavings: allocationDraft.desiredSavings
    });
    setAllocationSaved(true);
  };

  const handleSignOut = async () => {
    if (!onSignOut || signingOut) return;
    setSigningOut(true);
    setSignOutMessage('');
    try {
      await onSignOut();
    } catch (error) {
      setSignOutMessage(error?.message || '登出失敗，請稍後再試。');
      setSigningOut(false);
    }
  };

  return (
    <main className={`page settings-page ${activePanel ? 'is-detail' : ''}`}>
      <header className="settings-hero"><span>設定</span><h1>把這裡調成你習慣的樣子。</h1><p>外觀、記帳規則與 {butlerName}，都可以慢慢調整。</p></header>
      <div className="settings-content">
        <SettingsSection title="個人偏好" hint="外觀與首頁">
          <div className="appearance-panel">
            <div><span className="soft-icon"><Palette size={18} /></span><div><strong>畫面外觀</strong><p>預設跟著手機，也能另外調整。</p></div></div>
            <span className="appearance-label">顏色模式</span>
            <div className="theme-options">{[['system', '跟隨系統'], ['light', '淺色'], ['dark', '深色']].map(([id, label]) => <button type="button" key={id} className={theme === id ? 'is-active' : ''} onClick={() => onThemeChange(id)}>{label}</button>)}</div>
            <span className="appearance-label">文字大小</span>
            <div className="text-size-options">{[['system', '系統預設'], ['standard', '標準'], ['large', '大字'], ['xlarge', '特大']].map(([id, label]) => <button type="button" key={id} className={(settings.display?.textSize || 'system') === id ? 'is-active' : ''} onClick={() => updateNestedSetting('display', 'textSize', id)}>{label}</button>)}</div>
          </div>
          {showOnboardingRestart && <SettingRow icon={RotateCcw} title="重新查看進入畫面" detail="僅供開發測試，不會出現在正式版本" onClick={onRestartOnboarding} />}
          <SettingRow icon={Palette} title="首頁顯示內容" detail="待辦、最近紀錄與夢想目標" onClick={() => openPanel('home')} />
          <SettingRow icon={Bell} title="通知與提醒" detail="待繳費、預算與每日摘要" tone="peach" onClick={() => openPanel('notifications')} />
        </SettingsSection>

        <SettingsSection title="財務規則" hint="帳本怎麼運作">
          <SettingRow icon={Wallet} title="收入與每月分配" detail={allocationPending ? '收入待補上，儲蓄與日常預算尚未估算' : `本月收入 $${Number(settings.profile?.monthlyIncome || 0).toLocaleString('zh-TW')} · 日常 $${Number(monthlyBudget || 0).toLocaleString('zh-TW')}`} onClick={() => openPanel('allocation')} />
          <SettingRow icon={Tags} title="記帳分類" detail={`${settings.categories.length} 個分類，可新增或移除`} tone="lilac" onClick={() => openPanel('categories')} />
          <SettingRow icon={Repeat2} title="固定支出與繳費日" detail={`${recurring.filter(isPaymentTask).length} 筆固定支出，會保留每月繳費狀態`} tone="peach" onClick={() => openPanel('recurring')} />
          <SettingRow icon={Repeat2} title="帳務自動化" detail="固定帳單配對與確認方式" onClick={() => openPanel('automation')} />
          <SettingRow icon={Target} title="夢想目標" detail="建立、調整與收起存錢目標" onClick={onOpenGoals} />
        </SettingsSection>

        <SettingsSection title={butlerName + ' 管家'} hint="陪伴方式">
          <SettingRow icon={UserRound} title={`${settings.name || 'Fin'} 的名稱與說話方式`} detail="溫柔、活潑或比較嚴格" tone="peach" onClick={() => openPanel('butler')} />
        </SettingsSection>

        <SettingsSection title="我的資料" hint="管理與安全">
          <div className="account-summary">
            <span className="soft-icon"><UserRound size={18} /></span>
            <div><strong>{isAnonymous ? '訪客模式' : '已登入 FinMate'}</strong><p>{isAnonymous ? '資料屬於這個匿名帳號，請避免清除瀏覽器資料。' : (userEmail || '你的帳號資料會安全分開保存。')}</p></div>
          </div>
          {!isAnonymous && onSignOut && <button type="button" className="sign-out-button" onClick={handleSignOut} disabled={signingOut}><LogOut size={17} />{signingOut ? '正在登出…' : '登出帳號'}</button>}
          {signOutMessage && <p className="settings-error" role="alert">{signOutMessage}</p>}
          <SettingRow icon={Barcode} title="電子發票載具" detail="顯示與管理手機條碼" tone="peach" onClick={onOpenCarrier} />
          <SettingRow icon={Database} title="資料保存與帳本" detail={persistenceLabel} onClick={() => openPanel('data')} />
          <SettingRow icon={Download} title="資料備份與匯出" detail="下載完整 CSV 紀錄" tone="lilac" onClick={() => openPanel('export')} />
          <SettingRow icon={ShieldCheck} title="隱私與使用說明" detail="資料如何儲存與使用" tone="peach" onClick={() => openPanel('privacy')} />
          <button type="button" className="reset-button" onClick={onResetData}>清除所有 APP 資料</button>
        </SettingsSection>

        {activePanel && <section className="settings-detail-panel" aria-label={panelTitle}>
          <div className="settings-detail-panel__heading"><button type="button" onClick={() => { setActivePanel(null); document.querySelector('.app-scroll')?.scrollTo({ top: 0 }); }} aria-label="返回設定"><ChevronLeft size={20} /></button><div><small>設定</small><h2>{panelTitle}</h2></div></div>

          {activePanel === 'home' && <div className="toggle-list">
            <ToggleRow title="今天需要留意" detail="首頁顯示待繳費與固定項目" checked={settings.homeSections.reminders} onChange={(value) => updateNestedSetting('homeSections', 'reminders', value)} />
            <ToggleRow title="最近紀錄" detail="顯示最近記下的收支" checked={settings.homeSections.recentRecords} onChange={(value) => updateNestedSetting('homeSections', 'recentRecords', value)} />
            <ToggleRow title="夢想目標" detail="顯示首頁的目標進度" checked={settings.homeSections.goals} onChange={(value) => updateNestedSetting('homeSections', 'goals', value)} />
          </div>}

          {activePanel === 'allocation' && <form className="allocation-settings" onSubmit={saveAllocation}>
            <p className="settings-help">收入不固定也沒關係，可以先填這個月已確定會收到的總金額；之後再回來更新。</p>
            <label><span>本月預計收入</span><div><b>$</b><input type="number" min="0" disabled={allocationDraft.incomeUnknown} value={allocationDraft.monthlyIncome} onChange={(event) => { setAllocationSaved(false); setAllocationDraft({ ...allocationDraft, monthlyIncome: event.target.value, incomeUnknown: false }); }} placeholder="例如 15000" /></div></label>
            <button type="button" className={`income-unknown ${allocationDraft.incomeUnknown ? 'is-active' : ''}`} aria-pressed={allocationDraft.incomeUnknown} onClick={() => { setAllocationSaved(false); setAllocationDraft({ ...allocationDraft, incomeUnknown: !allocationDraft.incomeUnknown, monthlyIncome: '' }); }}><Check size={13} />目前仍不確定，先保留待估算</button>
            <label><span>希望每月先存</span><div><b>$</b><input type="number" min="0" value={allocationDraft.desiredSavings} onChange={(event) => { setAllocationSaved(false); setAllocationDraft({ ...allocationDraft, desiredSavings: event.target.value }); }} placeholder={`留空，交給 ${butlerName} 推薦`} /></div></label>
            <div className="allocation-settings__summary"><div><span>固定支出</span><strong>${Number(settings.profile?.fixedExpenses || 0).toLocaleString('zh-TW')}</strong></div><div><span>日常預算</span><strong>{allocationPending ? '待估算' : `$${Number(monthlyBudget || 0).toLocaleString('zh-TW')}`}</strong></div></div>
            <button type="submit" className="settings-save-button" disabled={!allocationDraft.incomeUnknown && Number(allocationDraft.monthlyIncome) <= 0}>重新計算本月分配</button>
            {!allocationPending && <label className="allocation-settings__override"><span>手動微調日常預算</span><div><b>$</b><input type="number" min="0" value={monthlyBudget} onChange={(event) => onBudgetChange(event.target.value)} aria-label="手動微調本月日常預算" /></div><small>這只調整日常可用金額，不會改動收入、固定支出或儲蓄目標。</small></label>}
            {allocationSaved && <p className="settings-saved" role="status">已更新本月收入與分配。</p>}
          </form>}

          {activePanel === 'notifications' && <div className="toggle-list">
            <ToggleRow title="APP 內繳費提醒" detail="固定支出接近到期時，在 APP 裡提醒" checked={settings.notifications.bills} onChange={(value) => updateNestedSetting('notifications', 'bills', value)} />
            <ToggleRow title="預算提醒" detail="快超過本月預算時提醒" checked={settings.notifications.budget} onChange={(value) => updateNestedSetting('notifications', 'budget', value)} />
            <ToggleRow title="每日小結" detail="晚上整理今天的花費" checked={settings.notifications.dailySummary} onChange={(value) => updateNestedSetting('notifications', 'dailySummary', value)} />
            <p className="settings-help">目前是 APP 內提醒；真正的手機推播會在完成帳號、後端與系統權限後接上。</p>
          </div>}

          {activePanel === 'categories' && <>
            <div className="category-chip-list">{settings.categories.map((category) => <span key={category}>{category}<button type="button" onClick={() => removeCategory(category)} aria-label={`移除 ${category}`}><X size={12} /></button></span>)}</div>
            <form className="settings-inline-form" onSubmit={addCategory}><input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="新增分類名稱" aria-label="新增分類名稱" /><button type="submit"><Plus size={15} />新增</button></form>
            <p className="settings-help">移除分類不會刪除以前的帳目；舊紀錄仍會保留原本的分類名稱。</p>
          </>}

          {activePanel === 'recurring' && <>
            <div className="recurring-setting-list">{recurring.filter(isPaymentTask).map((item) => {
              const completed = isRecurringCompleted(item);
              if (recurringEditDraft?.id === item.id) return <article className="recurring-edit-row" key={item.id}><form onSubmit={saveRecurringEdit}><input value={recurringEditDraft.title} onChange={(event) => setRecurringEditDraft({ ...recurringEditDraft, title: event.target.value })} aria-label="固定支出名稱" /><div><input type="number" min="1" value={recurringEditDraft.amount} onChange={(event) => setRecurringEditDraft({ ...recurringEditDraft, amount: event.target.value })} aria-label="固定支出金額" /><input type="number" min="1" max="31" value={recurringEditDraft.dueDay} onChange={(event) => setRecurringEditDraft({ ...recurringEditDraft, dueDay: event.target.value })} placeholder="繳費日" aria-label="每月繳費日" /></div><div className="recurring-edit-actions"><button type="button" onClick={() => setRecurringEditDraft(null)}>取消</button><button type="submit">儲存修改</button></div></form></article>;
              return <article key={item.id}><button type="button" className={`mini-check ${item.enabled !== false ? 'is-active' : ''}`} onClick={() => onRecurringChange(recurring.map((entry) => entry.id === item.id ? { ...entry, enabled: entry.enabled === false } : entry))} aria-label={`${item.enabled !== false ? '停用' : '啟用'} ${item.title}`}>{item.enabled !== false && <Check size={13} />}</button><div><strong>{item.title}</strong><small>${Number(item.amount).toLocaleString('zh-TW')}{item.dueDay ? ` · 每月 ${item.dueDay} 日` : ' · 尚未設定繳費日'}</small><div className="recurring-payment-state"><span className={completed ? 'is-complete' : ''}>{completed ? '本月已繳' : '本月待繳'}</span><button type="button" onClick={() => onPaymentAction(item, completed ? 'reopen' : 'complete')}>{completed ? '改回待繳' : '標記已繳'}</button></div></div><div className="recurring-item-actions"><button type="button" onClick={() => startRecurringEdit(item)} aria-label={`調整 ${item.title}`}><Pencil size={14} /></button><button type="button" onClick={() => onRecurringChange(recurring.filter((entry) => entry.id !== item.id))} aria-label={`刪除 ${item.title}`}><Trash2 size={15} /></button></div></article>;
            })}</div>
            {!recurring.some(isPaymentTask) && <p className="settings-help">還沒有固定支出，可以先加入房租、交通、訂閱或信用卡繳費。</p>}
            <form className="recurring-form" onSubmit={addRecurring}><strong>新增固定支出</strong><input value={recurringDraft.title} onChange={(event) => setRecurringDraft({ ...recurringDraft, title: event.target.value })} placeholder="例如：音樂訂閱" aria-label="固定支出名稱" /><div><input type="number" min="1" value={recurringDraft.amount} onChange={(event) => setRecurringDraft({ ...recurringDraft, amount: event.target.value })} placeholder="金額" aria-label="固定支出金額" /><input type="number" min="1" max="31" value={recurringDraft.dueDay} onChange={(event) => setRecurringDraft({ ...recurringDraft, dueDay: event.target.value })} placeholder="繳費日（可稍後填）" aria-label="每月繳費日" /></div><select value={recurringDraft.category} onChange={(event) => setRecurringDraft({ ...recurringDraft, category: event.target.value })}>{settings.categories.map((category) => <option key={category}>{category}</option>)}</select><button type="submit"><Plus size={15} />加入固定支出</button></form>
            <p className="settings-help">沒有填繳費日也會納入本月固定支出；補上日期後，首頁會在到期前五天提醒。</p>
          </>}

          {activePanel === 'automation' && <div className="automation-settings">
            <ToggleRow title="自動比對固定帳單" detail="你記下一筆支出後，找出金額與名稱相符的待繳項目" checked={settings.automation?.billMatching !== false} onChange={(value) => updateNestedSetting('automation', 'billMatching', value)} />
            <span>完全吻合時</span>
            <div className="tone-options">{[['auto', '直接標記，可更正'], ['ask', '先問過我']].map(([id, label]) => <button type="button" key={id} className={(settings.automation?.exactMatchAction || 'auto') === id ? 'is-active' : ''} onClick={() => updateNestedSetting('automation', 'exactMatchAction', id)}>{label}</button>)}</div>
            <p className="settings-help">目前只比對你在 {butlerName} 裡記下的支出，不會讀取其他銀行 APP 的通知；銀行與載具同步完成後才會加入外部交易。</p>
          </div>}

          {activePanel === 'butler' && <div className="butler-settings">
            <label>管家名稱<input value={settings.name || ''} maxLength="12" onChange={(event) => onSettingsChange({ ...settings, name: event.target.value })} /></label>
            <span>說話方式</span><div className="tone-options">{[['gentle', '溫柔'], ['lively', '活潑'], ['strict', '嚴格']].map(([id, label]) => <button type="button" key={id} className={settings.tone === id ? 'is-active' : ''} onClick={() => onSettingsChange({ ...settings, tone: id })}>{label}</button>)}</div>
            <p className="settings-help">這只調整管家的語氣，不會改變記帳判斷與你的帳目。</p>
          </div>}

          {activePanel === 'data' && <div className="data-summary"><div><span>交易紀錄</span><strong>{transactions.length} 筆</strong></div><div><span>資料狀態</span><strong>{backendStatus === 'connected' ? '已保存' : '瀏覽器暫存'}</strong></div><button type="button" onClick={() => exportTransactionsToCSV(transactions)}><Download size={15} />下載帳本</button><p className="settings-help">{isAnonymous ? '目前使用訪客帳號；換裝置或清除瀏覽器資料後，可能無法回到同一份資料。' : '資料會依登入帳號分開保存；重新登入同一帳號即可取回。'}</p></div>}

          {activePanel === 'export' && <div className="export-settings"><strong>先留一份自己的帳本</strong><p>會把目前全部交易整理成 CSV 檔，可使用 Excel、Numbers 或 Google 試算表開啟。</p><button type="button" onClick={() => exportTransactionsToCSV(transactions)}><Download size={15} />匯出 {transactions.length} 筆紀錄</button><small>目前只匯出帳目；夢想目標與管家設定之後可再加入完整備份。</small></div>}

          {activePanel === 'privacy' && <div className="privacy-copy"><strong>{isAnonymous ? '訪客資料說明' : '帳號資料說明'}</strong><p>{isAnonymous ? '帳目、目標與設定屬於目前的匿名帳號。請勿登出或清除瀏覽器資料，以免無法回到同一個訪客帳號。' : '帳目、目標與設定會依目前登入帳號保存，其他使用者無法讀取。Email 與密碼驗證由 Supabase Auth 處理。'}</p></div>}
        </section>}
      </div>
    </main>
  );
}

function SettingsSection({ title, hint, children }) {
  return <section className="settings-section"><div className="settings-section__heading"><span>{title}</span><small>{hint}</small></div>{children}</section>;
}

function SettingRow({ icon: Icon, title, detail, tone = '', onClick }) {
  return <button type="button" className="setting-row" onClick={onClick}><span className={`soft-icon ${tone ? `soft-icon--${tone}` : ''}`}><Icon size={18} /></span><div><strong>{title}</strong><p>{detail}</p></div><ChevronRight size={16} /></button>;
}

function ToggleRow({ title, detail, checked, onChange }) {
  return <label className="toggle-row"><span><strong>{title}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;
}
