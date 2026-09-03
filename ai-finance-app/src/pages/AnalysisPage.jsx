import { CircleDollarSign, Target, Wallet } from 'lucide-react';

const money = (value) => Math.round(Number(value || 0)).toLocaleString('zh-TW');

export default function AnalysisPage({ summary, butlerName = 'Fin', plannedSavings = 0, allocationStatus = 'ready' }) {
  const previousCategories = summary.previousComparableCategories || summary.previousCategories;
  const previousExpenses = summary.previousComparableExpenses ?? summary.previousExpenses;
  const categories = [...new Set([
    ...Object.keys(summary.currentCategories),
    ...Object.keys(previousCategories)
  ])].map((category) => ({
    category,
    current: summary.currentCategories[category] || 0,
    previous: previousCategories[category] || 0
  })).sort((a, b) => b.current - a.current).slice(0, 5);
  const maxAmount = Math.max(1, ...categories.flatMap((item) => [item.current, item.previous]));
  const hasAnyData = summary.currentExpenses > 0 || previousExpenses > 0;
  const isBetter = summary.currentExpenses <= previousExpenses;
  const delta = summary.currentExpenses - previousExpenses;
  const allocationPending = allocationStatus === 'pending-income';

  return (
    <main className="page analysis-page">
      <header className="analysis-hero">
        <div className="page-topline"><span>分析</span><span>{summary.currentMonthKey.replace('-', ' 年 ')} 月</span></div>
        <h1>{!hasAnyData ? '先從第一筆紀錄開始。' : !previousExpenses ? '這個月的紀錄正在慢慢累積。' : isBetter ? '截至今天，比上月同期更穩一點。' : '截至今天，支出比上月同期高一些。'}</h1>
        <p>{hasAnyData ? '先看結論，再慢慢看錢花去了哪裡。' : '記下日常花費後，我會替你整理分類與趨勢。'}</p>
        <div className="analysis-total"><div><span>本月截至今天</span><strong>${money(summary.currentExpenses)}</strong></div><div className="status-pill">{previousExpenses ? `比上月同期${delta >= 0 ? '多' : '少'} $${money(Math.abs(delta))}` : '尚無上月同期資料'}</div></div>
      </header>

      <section className="analysis-content">
        <div className="analysis-heading"><div><span>相同天數比較</span><h2>跟上月同期差在哪？</h2></div><div className="legend"><span><i />本月</span><span><i className="previous" />上月同期</span></div></div>
        <div className="comparison-list">
          {categories.length ? categories.map((item) => (
            <article className="comparison-row" key={item.category}>
              <div><strong>{item.category}</strong><span className={item.current > item.previous ? 'is-up' : ''}>{item.current === item.previous ? '與上月同期相同' : `比上月同期${item.current > item.previous ? '多' : '少'} $${money(Math.abs(item.current - item.previous))}`}</span></div>
              <Bar label="本月" amount={item.current} max={maxAmount} />
              <Bar label="同期" amount={item.previous} max={maxAmount} previous />
            </article>
          )) : <p className="empty-copy">還沒有足夠的支出資料可以分析。</p>}
        </div>

        <section className="fin-advice">
          <div className="fin-advice__head"><i /><div><h2>{butlerName} 幫你整理好了</h2><p>{allocationPending ? '補上本月收入後，我才能給你可靠的分配建議。' : '照這樣安排，到月底會比較安心。'}</p></div></div>
          <AdviceRow icon={Wallet} label="每天建議可使用" value={allocationPending ? '待設定' : `$${money(summary.todayAvailable)}`} />
          <AdviceRow icon={CircleDollarSign} label="本月還可使用" value={allocationPending ? '待設定' : `$${money(summary.monthRemaining)}`} />
          <AdviceRow icon={Target} label="本月原先規劃儲蓄" value={allocationPending ? '待設定' : `$${money(plannedSavings)}`} />
        </section>
      </section>
    </main>
  );
}

function Bar({ label, amount, max, previous = false }) {
  return <div className="analysis-bar"><span>{label}</span><div><i className={previous ? 'previous' : ''} style={{ width: `${(amount / max) * 100}%` }} /></div><b>${money(amount)}</b></div>;
}

function AdviceRow({ icon: Icon, label, value }) {
  return <div className="advice-row"><span className="soft-icon"><Icon size={16} /></span><span>{label}</span><strong>{value}</strong></div>;
}
