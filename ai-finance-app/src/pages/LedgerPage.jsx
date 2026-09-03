import { useEffect, useMemo, useState } from 'react';
import { Bus, ChevronLeft, ChevronRight, Download, Pencil, Search, Trash2, Utensils, WalletCards, X } from 'lucide-react';
import { exportTransactionsToCSV } from '../utils/csvExporter';
import { createMonthFinanceSummary } from '../modules/finance/financeSummary.js';

const money = (value) => Math.round(Number(value || 0)).toLocaleString('zh-TW');
const categoryIcon = (category) => category === '飲食' ? Utensils : category === '交通' ? Bus : WalletCards;

export default function LedgerPage({ summary, butlerName = 'Fin', categories: availableCategories = [], allocationStatus = 'ready', onDeleteTransaction, onEditTransaction }) {
  const [view, setView] = useState('overview');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [monthOffset, setMonthOffset] = useState(0);
  const [editing, setEditing] = useState(null);

  const currentYear = Number(summary.currentMonthKey.slice(0, 4));
  const currentMonth = Number(summary.currentMonthKey.slice(5, 7));
  const viewedDate = new Date(currentYear, currentMonth - 1 + monthOffset, 1);
  const year = viewedDate.getFullYear();
  const month = viewedDate.getMonth() + 1;
  const viewedMonthKey = `${year}-${String(month).padStart(2, '0')}`;
  const viewedMonth = useMemo(() => createMonthFinanceSummary({
    transactions: summary.recentTransactions,
    monthlyBudget: summary.monthlyBudget,
    paymentTasks: summary.paymentTasks,
    monthKey: viewedMonthKey
  }), [summary.recentTransactions, summary.monthlyBudget, summary.paymentTasks, viewedMonthKey]);
  const monthTransactions = viewedMonth.transactions;
  const categories = Object.entries(viewedMonth.categories).sort((a, b) => b[1] - a[1]);
  const maxCategory = Math.max(1, ...categories.map(([, amount]) => amount));
  const filtered = useMemo(() => monthTransactions
    .filter((transaction) => filter === 'all' || transaction.type === filter)
    .filter((transaction) => `${transaction.title} ${transaction.amount} ${transaction.date}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [monthTransactions, filter, search]);
  const calendarTransactions = monthTransactions;
  const days = new Date(year, month, 0).getDate();
  const leading = new Date(year, month - 1, 1).getDay();
  const daysWithRecords = new Set(calendarTransactions.map((transaction) => Number(transaction.date.slice(-2))));
  const selectedDate = `${viewedMonthKey}-${String(selectedDay).padStart(2, '0')}`;
  const selectedTransactions = calendarTransactions.filter((transaction) => transaction.date === selectedDate);
  const allocationPending = allocationStatus === 'pending-income';

  useEffect(() => {
    setSelectedDay(monthOffset === 0 ? new Date().getDate() : 1);
  }, [monthOffset]);

  const openEditor = (transaction) => setEditing({
    id: transaction.id,
    title: transaction.title,
    amount: String(transaction.amount),
    type: transaction.type,
    category: transaction.category || '其他',
    date: transaction.date
  });

  const saveEdit = (event) => {
    event.preventDefault();
    const amount = Number(editing.amount);
    if (!editing.title.trim() || !Number.isFinite(amount) || amount <= 0 || !editing.date) return;
    onEditTransaction(editing.id, { ...editing, amount });
    setEditing(null);
  };

  const confirmDelete = (transaction) => {
    if (window.confirm(`確定要刪除「${transaction.title}」嗎？`)) onDeleteTransaction(transaction.id);
  };

  return (
    <main className="page ledger-page">
      <header className="ledger-hero">
        <div className="page-topline"><span>帳本</span><button type="button" className="icon-button" onClick={() => exportTransactionsToCSV(monthTransactions)} aria-label="匯出本月 CSV"><Download size={17} /></button></div>
        <h1>{year} 年 {month} 月帳本</h1>
        <p>每一筆，都有好好記下來。</p>
        <div className="ledger-summary"><div><span>{month} 月支出</span><strong>${money(viewedMonth.expenses)}</strong></div><i /><div><span>{month} 月日常預算剩餘</span><strong>{allocationPending ? '待設定' : `$${money(viewedMonth.remaining)}`}</strong></div></div>
      </header>

      <div className="segmented-tabs" role="tablist">
        {['overview', 'calendar', 'stream'].map((id) => (
          <button key={id} type="button" className={view === id ? 'is-active' : ''} onClick={() => setView(id)}>
            {id === 'overview' ? '本月摘要' : id === 'calendar' ? '看日期' : '全部明細'}
          </button>
        ))}
      </div>

      <section className="ledger-content">
        {view === 'overview' && (
          <>
            <div className="detail-heading"><div><span>支出分配</span><h2>這個月花去哪裡？</h2></div></div>
            <div className="category-list">
              {categories.map(([category, amount], index) => {
                const Icon = categoryIcon(category);
                return (
                  <article className="category-row" key={category}>
                    <span className={`soft-icon ${index === 1 ? 'soft-icon--peach' : index === 2 ? 'soft-icon--lilac' : ''}`}><Icon size={17} /></span>
                    <div><div><strong>{category}</strong><small>{viewedMonth.expenses ? Math.round((amount / viewedMonth.expenses) * 100) : 0}%</small></div><div className="progress-track"><i style={{ width: `${(amount / maxCategory) * 100}%` }} /></div></div>
                    <b>${money(amount)}</b>
                  </article>
                );
              })}
            </div>
            <aside className="fin-note"><i /><div><strong>{butlerName} 注意到</strong><p>{categories[0] ? `目前最多支出在「${categories[0][0]}」，共 $${money(categories[0][1])}。` : '這個月還沒有支出資料。'}</p></div></aside>
            <div className="detail-heading detail-heading--spaced"><h2>最近紀錄</h2><button type="button" onClick={() => setView('stream')}>查看全部 <ChevronRight size={14} /></button></div>
            {monthTransactions.slice().sort((a, b) => `${b.date || ''}${b.createdAt || ''}`.localeCompare(`${a.date || ''}${a.createdAt || ''}`)).slice(0, 3).map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}
          </>
        )}

        {view === 'calendar' && (
          <>
            <div className="calendar-heading"><button type="button" aria-label="上個月" onClick={() => setMonthOffset((current) => current - 1)}><ChevronLeft size={18} /></button><strong>{year} 年 {month} 月</strong><button type="button" aria-label="下個月" disabled={monthOffset >= 0} onClick={() => setMonthOffset((current) => Math.min(0, current + 1))}><ChevronRight size={18} /></button></div>
            <div className="calendar-grid"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>{Array.from({ length: leading }, (_, index) => <i key={`empty-${index}`} />)}{Array.from({ length: days }, (_, index) => index + 1).map((day) => <button type="button" key={day} className={`${selectedDay === day ? 'is-selected' : ''} ${daysWithRecords.has(day) ? 'has-record' : ''}`} onClick={() => setSelectedDay(day)}>{day}</button>)}</div>
            <section className="selected-day"><div className="detail-heading"><div><span>{month} 月 {selectedDay} 日</span><h2>這天的紀錄</h2></div><strong>${money(selectedTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))}</strong></div>{selectedTransactions.length ? selectedTransactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />) : <p className="empty-copy">這一天沒有紀錄。</p>}</section>
          </>
        )}

        {view === 'stream' && (
          <>
            <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋項目、金額或日期" /></label>
            <div className="filter-pills">{[['all', '全部'], ['expense', '支出'], ['income', '收入']].map(([id, label]) => <button type="button" key={id} className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>
            <div className="stream-list">{filtered.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} editable onEdit={openEditor} onDelete={confirmDelete} />)}</div>
          </>
        )}
      </section>

      {editing && <div className="edit-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}>
        <form className="edit-sheet" onSubmit={saveEdit} aria-label="修改帳目">
          <header><div><small>帳本</small><h2>修改這筆紀錄</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="關閉"><X size={18} /></button></header>
          <label>項目名稱<input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} /></label>
          <label>金額<div className="edit-money-input"><span>$</span><input type="number" min="1" value={editing.amount} onChange={(event) => setEditing({ ...editing, amount: event.target.value })} /></div></label>
          <div className="edit-sheet__pair">
            <label>類型<select value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value })}><option value="expense">支出</option><option value="income">收入</option></select></label>
            <label>日期<input type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} /></label>
          </div>
          <label>分類<select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value })}>{[...new Set([...availableCategories, editing.category, '其他'])].map((category) => <option key={category}>{category}</option>)}</select></label>
          <button type="submit" className="edit-sheet__save">儲存修改</button>
        </form>
      </div>}
    </main>
  );
}

function TransactionRow({ transaction, editable = false, onEdit, onDelete }) {
  const Icon = categoryIcon(transaction.category);
  return (
    <article className="transaction-row">
      <span className="soft-icon"><Icon size={17} /></span>
      <div><strong>{transaction.title}</strong><small>{transaction.date} · {transaction.category}</small></div>
      <b className={transaction.type === 'income' ? 'is-income' : ''}>{transaction.type === 'income' ? '+' : '−'} ${money(transaction.amount)}</b>
      {editable && <div className="row-actions"><button type="button" onClick={() => onEdit(transaction)} aria-label={`編輯 ${transaction.title}`}><Pencil size={14} /></button><button type="button" onClick={() => onDelete(transaction)} aria-label={`刪除 ${transaction.title}`}><Trash2 size={14} /></button></div>}
    </article>
  );
}
