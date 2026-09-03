import React, { useState } from 'react';
import { LineChart, TrendingDown, TrendingUp, ArrowRightLeft, Award, BarChart3, CheckCircle2, Target, PiggyBank } from 'lucide-react';
import { getMonthKey, getPreviousMonthKey } from '../utils/date';

export default function AnalyticsView({ transactions }) {
  // Top Sub-Tab Switcher: 'current' (本月財務概覽) vs 'compare' (與上月比較)
  const [subTab, setSubTab] = useState('current');

  const today = new Date();
  const currentMonthKey = getMonthKey(today);
  const previousMonthKey = getPreviousMonthKey(today);
  const currentMonthTxs = transactions.filter(t => t.date.startsWith(currentMonthKey) && t.type === 'expense');
  const prevMonthTxs = transactions.filter(t => t.date.startsWith(previousMonthKey) && t.type === 'expense');

  const currentTotal = currentMonthTxs.reduce((sum, t) => sum + t.amount, 0);
  const prevTotal = prevMonthTxs.reduce((sum, t) => sum + t.amount, 0);

  // Month-over-Month calculation
  const diff = currentTotal - prevTotal;
  const percentChange = prevTotal > 0 ? Math.round((diff / prevTotal) * 100) : 0;

  // Category breakdown with Icons
  const categoryIcons = {
    '飲食': '🍱',
    '交通': '🚌',
    '娛樂': '🎮',
    '日常': '🏠',
    '學習': '📚',
    '固定支出': '💳',
    '儲蓄夢想': '🎯'
  };

  const categoryTotals = currentMonthTxs.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const prevCategoryTotals = prevMonthTxs.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  // Daily Trend Data (8/1 - 8/13)
  const dailySpendMap = currentMonthTxs.reduce((acc, t) => {
    const day = parseInt(t.date.split('-')[2], 10);
    acc[day] = (acc[day] || 0) + t.amount;
    return acc;
  }, {});

  const daysList = Array.from({ length: today.getDate() }, (_, index) => index + 1);
  const maxDailyAmt = Math.max(...Object.values(dailySpendMap), 100);

  // SVG Trend Line Coordinates calculation
  const svgWidth = 320;
  const svgHeight = 90;
  const points = daysList.map((day, idx) => {
    const amt = dailySpendMap[day] || 0;
    const x = (idx / (daysList.length - 1)) * (svgWidth - 20) + 10;
    const y = svgHeight - 15 - (amt / maxDailyAmt) * (svgHeight - 30);
    return { x, y, amt, day };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points[0].x},${svgHeight - 10} ${polylinePoints} ${points[points.length - 1].x},${svgHeight - 10}`;

  // MoM Category Comparison Data
  const momCategories = ['飲食', '交通', '娛樂', '日常', '學習'];
  const momChartData = momCategories.map((cat) => {
    const cur = categoryTotals[cat] || 0;
    const prev = prevCategoryTotals[cat] || 0;
    const delta = cur - prev;
    return { category: cat, icon: categoryIcons[cat] || '📦', cur, prev, delta };
  });

  const maxMomAmt = Math.max(...momChartData.map(d => Math.max(d.cur, Math.min(d.prev, 1000))), 200);
  const peakMoMIdx = momChartData.reduce((maxIdx, d, idx, arr) => d.cur > arr[maxIdx].cur ? idx : maxIdx, 0);

  // Budget Calculations
  const monthlyBudget = 15000;
  const remainingBudget = monthlyBudget - currentTotal;
  const budgetPct = Math.min(100, Math.round((currentTotal / monthlyBudget) * 100));

  return (
    <div className="p-4 space-y-4 animate-fade-in flex-1 pb-28">
      {/* 1. Header with iOS-Style Full-Width Segmented Switcher Bar */}
      <div className="flex items-center justify-between text-sm font-bold text-primary">
        <div className="flex items-center gap-2">
          <LineChart size={18} className="text-accent-sky" />
          <span>財務數據分析</span>
        </div>
        <span className="text-10 text-muted font-mono bg-input px-2.5 py-1 rounded-full border border-card">
          2026年8月
        </span>
      </div>

      <div className="grid grid-cols-2 bg-input p-1 rounded-2xl border border-card gap-1">
        <button
          onClick={() => setSubTab('current')}
          className={`btn-interactive py-2 rounded-xl text-xs font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
            subTab === 'current'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <span>🔥 本月財務概覽</span>
        </button>
        <button
          onClick={() => setSubTab('compare')}
          className={`btn-interactive py-2 rounded-xl text-xs font-extrabold transition-all text-center flex items-center justify-center gap-1.5 ${
            subTab === 'compare'
              ? 'bg-sky-500 text-slate-950 shadow-md'
              : 'text-secondary hover:text-primary'
          }`}
        >
          <span>📊 跨月對比 (較上月)</span>
        </button>
      </div>

      {/* VIEW MODE A: 【本月分析 - 趨勢導向】 */}
      {subTab === 'current' ? (
        <div className="space-y-4">
          {/* Card 1: 本月支出總額 */}
          <div className="glass-card p-4 space-y-2">
            <span className="text-xs text-secondary font-bold block">本月支出總額</span>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-mono font-extrabold text-accent-sky">
                ${currentTotal.toLocaleString()}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                percentChange <= 0 ? 'bg-emerald-500-20 text-accent-emerald border-emerald-500-30' : 'bg-rose-500-20 text-rose-400 border-rose-500-30'
              }`}>
                {percentChange <= 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
                <span>較上月 {percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`}</span>
              </span>
            </div>
          </div>

          {/* Card 2: 每日支出趨勢圖 */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-card pb-2.5">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <LineChart size={15} className="text-accent-sky" />
                每日支出趨勢圖
              </span>
              <span className="text-10 text-muted font-mono">8/1 - 8/13</span>
            </div>

            <div className="bg-input p-3-5 rounded-2xl border border-card space-y-2">
              <div className="relative w-full h-28 flex items-center justify-center pt-2">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <polygon points={areaPoints} fill="url(#trendGradient)" />

                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />

                  {points.map((p) => {
                    if (p.amt === 0) return null;
                    return (
                      <g key={p.day}>
                        <circle cx={p.x} cy={p.y} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                        <text
                          x={p.x}
                          y={p.y - 8}
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          ${p.amt}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="flex justify-between items-center text-10 font-mono text-muted px-2 pt-1 border-t border-card/60">
                <span>8/1</span>
                <span>8/4</span>
                <span>8/7</span>
                <span>8/10</span>
                <span>8/13</span>
              </div>

              <p className="text-10 text-muted text-center pt-0.5">
                數據反映單日開銷波動，最高消費日為 8/13 ($380元)
              </p>
            </div>
          </div>

          {/* Card 3: 分類比例與金額 */}
          <div className="glass-card p-4 space-y-3">
            <span className="text-xs font-bold text-primary block border-b border-card pb-2">
              分類比例與金額
            </span>
            <div className="space-y-2.5">
              {sortedCategories.map(([cat, amt]) => {
                const icon = categoryIcons[cat] || '📦';
                const pct = currentTotal > 0 ? Math.round((amt / currentTotal) * 100) : 0;
                return (
                  <div key={cat} className="bg-input p-3 rounded-2xl border border-card space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base p-1 rounded-lg bg-card border border-card">{icon}</span>
                        <span className="font-bold text-primary">{cat}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-extrabold text-accent-sky text-sm">${amt.toLocaleString()}</span>
                        <span className="text-10 text-muted ml-1 font-mono">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-card overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE B: 【與上月比較】 */
        <div className="space-y-4">
          {/* Master Combined Card */}
          <div className="glass-card p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-card pb-3.5 pt-0.5">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <ArrowRightLeft size={15} className="text-accent-sky" />
                跨月總額對比 (8月 vs 7月)
              </span>
              <span className={`text-10 font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 -translate-y-1 shadow-xs ${
                percentChange <= 0 ? 'bg-emerald-500-20 text-accent-emerald border-emerald-500-30' : 'bg-rose-500-20 text-rose-400 border-rose-500-30'
              }`}>
                {percentChange <= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                <span>較上月 {percentChange > 0 ? `+${percentChange}%` : `${percentChange}%`}</span>
              </span>
            </div>

            {/* 7月 vs 8月 總額雙欄位卡片 */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-purple-950/30 p-3 rounded-2xl border border-purple-500/30 space-y-1">
                <span className="text-10 font-bold text-purple-300 block">📅 7月歷史支出</span>
                <span className="text-lg font-mono font-extrabold text-purple-300 block">
                  ${prevTotal.toLocaleString()}
                </span>
              </div>

              <div className="bg-sky-950/30 p-3 rounded-2xl border border-sky-500/40 space-y-1">
                <span className="text-10 font-bold text-accent-sky block">🔥 8月當前支出</span>
                <span className="text-lg font-mono font-extrabold text-accent-sky block">
                  ${currentTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 直方圖區域 */}
            <div className="bg-input p-4 rounded-2xl border border-card space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-primary">
                <span className="flex items-center gap-1">
                  <BarChart3 size={15} className="text-emerald-400" />
                  分類跨月對比直方圖
                </span>

                <div className="flex items-center gap-2.5 text-xs font-bold shrink-0">
                  <div className="flex items-center gap-1">
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#c084fc', borderRadius: '1.5px', boxShadow: '0 0 4px rgba(192, 132, 252, 0.8)', flexShrink: 0 }} />
                    <span className="text-purple-300 text-11 font-bold">7月</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#34d399', borderRadius: '1.5px', boxShadow: '0 0 4px rgba(52, 211, 153, 0.9)', flexShrink: 0 }} />
                    <span className="text-accent-emerald text-11 font-extrabold">8月</span>
                  </div>
                </div>
              </div>

              {/* Plant-like Upward Column Area */}
              <div className="pt-6 pb-0">
                <div className="grid grid-cols-5 gap-2 items-end h-40 px-1 border-b-2 border-slate-600">
                  {momChartData.map((d, idx) => {
                    const isPeak = idx === peakMoMIdx && d.cur > 0;
                    const curHeight = d.cur > 0
                      ? Math.max(16, Math.round((d.cur / maxMomAmt) * 125))
                      : 6;
                    const prevHeight = d.prev > 0
                      ? Math.max(16, Math.min(125, Math.round((d.prev / maxMomAmt) * 125)))
                      : 6;

                    return (
                      <div key={d.category} className="flex flex-col items-center justify-end h-full relative">
                        {/* Top Delta Badge */}
                        <span className={`text-[9px] font-mono font-bold mb-1.5 whitespace-nowrap ${
                          d.delta <= 0 ? 'text-accent-emerald' : 'text-rose-400'
                        }`}>
                          {d.delta <= 0 ? `-${Math.abs(d.delta)}` : `+${d.delta}`}
                        </span>

                        {/* Dual Bars Side by Side */}
                        <div
                          style={{ display: 'flex', alignItems: 'flex-end', justify: 'center' }}
                          className="gap-1.5 w-full h-full"
                        >
                          <div
                            style={{
                              height: `${prevHeight}px`,
                              width: '12px',
                              background: 'linear-gradient(to top, #7e22ce 0%, #c084fc 100%)',
                              boxShadow: '0 0 8px rgba(192, 132, 252, 0.3)',
                              transformOrigin: 'bottom'
                            }}
                            className="rounded-t-md opacity-90 border-t border-x border-purple-300/40 shrink-0 transition-all duration-700"
                            title={`7月 (上月) ${d.category}: $${d.prev}`}
                          />

                          <div
                            style={{
                              height: `${curHeight}px`,
                              width: '14px',
                              background: d.cur > 0 ? 'linear-gradient(to top, #059669 0%, #34d399 100%)' : '#334155',
                              boxShadow: isPeak ? '0 0 12px rgba(52, 211, 153, 0.6)' : 'none',
                              transformOrigin: 'bottom'
                            }}
                            className="rounded-t-md border-t border-x border-white/40 shrink-0 transition-all duration-700"
                            title={`8月 (當月) ${d.category}: $${d.cur}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Category Icons & Titles */}
                <div className="grid grid-cols-5 gap-2 text-center pt-2.5">
                  {momChartData.map((d) => (
                    <div key={d.category} className="flex flex-col items-center">
                      <span className="text-xs block">{d.icon}</span>
                      <span className="text-10 font-bold text-secondary block">{d.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 各分類數據差異對比明細 */}
            <div className="space-y-2 pt-1">
              <span className="text-11 font-bold text-secondary block px-1">分類差異明細</span>
              {momChartData.map((d) => (
                <div key={d.category} className="bg-input p-3 rounded-2xl border border-card space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-base p-1 rounded-lg bg-card border border-card">{d.icon}</span>
                      <span className="font-bold text-primary">{d.category}</span>
                    </div>
                    <span className={`text-10 font-bold px-2 py-0.5 rounded-full font-mono border ${
                      d.delta <= 0 ? 'bg-emerald-500-20 text-accent-emerald border-emerald-500-30' : 'bg-rose-500-20 text-rose-400 border-rose-500-30'
                    }`}>
                      {d.delta <= 0 ? `較上月少 $${Math.abs(d.delta).toLocaleString()}` : `較上月多 $${d.delta.toLocaleString()}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-11 pt-0.5 border-t border-card/60 font-mono">
                    <span className="text-accent-sky font-bold">
                      本月 (8月): <span className="text-sm font-extrabold">${d.cur.toLocaleString()}</span>
                    </span>
                    <span className="text-purple-300">
                      上月 (7月): <span className="font-bold">${d.prev.toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 新增功能卡片 1: 🏆 【跨月省錢成就與管家點評】 */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-card pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Award size={16} className="text-amber-400" />
                <span>跨月省錢勳章與管家評語</span>
              </div>
              <span className="text-10 px-2 py-0.5 rounded-full bg-emerald-500-20 text-accent-emerald font-bold border border-emerald-500-30 flex items-center gap-1">
                <CheckCircle2 size={12} />
                成就解鎖
              </span>
            </div>

            <div className="bg-input p-3 rounded-2xl border border-card space-y-1.5 text-xs">
              <span className="font-bold text-accent-emerald flex items-center gap-1">
                🏅 獲頒「荷包守護大師」勳章！
              </span>
              <p className="text-11 text-secondary leading-relaxed">
                本月總支出較上個月大幅降低了 <span className="font-bold text-accent-emerald">$18,726 元 (-96%)</span>！主要歸功於飲食開銷的嚴格控制，省下的預算可直接撥入夢想基金喔～
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 🔥【全新替換】8月預算剩餘與夢想存錢預測卡片 (取代舊版情緒消費區塊) */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-card pb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <Target size={16} className="text-sky-400" />
            <span>8月預算剩餘與夢想存錢預測</span>
          </div>
          <span className="text-10 font-bold px-2 py-0.5 rounded-full bg-sky-500-20 text-accent-sky border border-sky-500-30 flex items-center gap-1 font-mono">
            <PiggyBank size={13} />
            已省下 94.2%
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {/* Progress Bar Header */}
          <div className="flex justify-between items-baseline text-xs">
            <span className="text-muted font-medium">預算總額: <span className="font-mono text-primary font-bold">${monthlyBudget.toLocaleString()}</span></span>
            <span className="text-accent-emerald font-mono font-bold">
              剩餘額度: <span className="text-sm font-extrabold">${remainingBudget.toLocaleString()}</span>
            </span>
          </div>

          {/* Budget Progress Bar */}
          <div className="w-full h-3 rounded-full bg-input overflow-hidden p-0.5 border border-card">
            <div
              style={{ width: `${budgetPct}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-500 shadow-sm"
            />
          </div>

          {/* Butler Wishlist Deposit Forecast */}
          <div className="bg-input p-3 rounded-2xl border border-sky-500-30 space-y-1 text-xs">
            <span className="font-bold text-accent-sky flex items-center gap-1">
              ✨ 管家 Fin 的夢想基金提撥預測：
            </span>
            <p className="text-11 text-secondary leading-relaxed">
              照目前極佳的省錢速度，本月月底預計可省下 <span className="font-bold text-accent-emerald">${remainingBudget.toLocaleString()} 元</span>！可以直接撥入您的 <span className="font-bold text-amber-400">『🎯 東京機票 ✈️』</span> 夢想目標存款囉！
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
