import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, ShieldCheck, Sparkles, X, Compass } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function GoalsView({ goals, onAddGoal, onDepositGoal }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGoalForDeposit, setSelectedGoalForDeposit] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Add Goal Form State
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newCategory, setNewCategory] = useState('旅遊');
  const [targetMonths, setTargetMonths] = useState(12);

  // AI Estimator State
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiEstimateResult, setAiEstimateResult] = useState(null);

  // Preset Popular Dream Templates with Market Estimates
  const DREAM_TEMPLATES = [
    { title: '🏰 歐洲 10 天自由行', category: '旅遊', amount: 75000, icon: '✈️', breakdown: '機票 $32,000 + 住宿 $25,000 + 門票餐飲 $18,000' },
    { title: '🌸 日本東京 5 天賞櫻', category: '旅遊', amount: 35000, icon: '🗼', breakdown: '廉航機票 $12,000 + 飯店 $13,000 + 吃喝購物 $10,000' },
    { title: '💻 M4 MacBook Pro', category: '3C設備', amount: 48000, icon: '💻', breakdown: '主機規格 $44,900 + AppleCare與配件 $3,100' },
    { title: '🛵 考照與購買 Gogoro', category: '交通工具', amount: 68000, icon: '🛵', breakdown: '新車款 $62,000 + 駕照費用 $4,000 + 安全帽 $2,000' },
  ];

  // AI Price Estimation Engine Simulation
  const handleAIEstimate = () => {
    if (!newTitle) {
      alert('請先輸入或點選目標名稱（例如：去歐洲自由行、韓國旅遊、買筆電）！');
      return;
    }

    setIsEstimating(true);

    setTimeout(() => {
      let estAmount = 50000;
      let items = [];

      const query = newTitle.toLowerCase();
      if (query.includes('歐洲') || query.includes('法') || query.includes('德') || query.includes('英')) {
        estAmount = 75000;
        items = [
          { name: '✈️ 來回機票預估', price: 32000 },
          { name: '🏨 10 晚特色旅店與飯店', price: 25000 },
          { name: '🍱 每日美食餐飲與博物館門票', price: 18000 },
        ];
      } else if (query.includes('日本') || query.includes('東京') || query.includes('大阪') || query.includes('韓國')) {
        estAmount = 35000;
        items = [
          { name: '✈️ 來回機票/廉航預估', price: 12000 },
          { name: '🏨 4 晚市中心商務飯店', price: 13000 },
          { name: '🛍️ 美食甜點與藥妝景點門票', price: 10000 },
        ];
      } else if (query.includes('macbook') || query.includes('電腦') || query.includes('筆電') || query.includes('ipad')) {
        estAmount = 48000;
        items = [
          { name: '💻 核心主機規格', price: 44900 },
          { name: '🛡️ AppleCare+ 保固與配件', price: 3100 },
        ];
      } else if (query.includes('機車') || query.includes('gogoro') || query.includes('車')) {
        estAmount = 68000;
        items = [
          { name: '🛵 車款扣除政府補助估算', price: 62000 },
          { name: '🪖 駕照報名費與安全防護裝備', price: 6000 },
        ];
      } else {
        // Generic estimate
        estAmount = Math.max(10000, Math.round((newTitle.length * 4500) / 100) * 100);
        items = [
          { name: '🎯 核心主項目基本預估', price: Math.round(estAmount * 0.7) },
          { name: '📦 周邊配件與彈性預備金', price: Math.round(estAmount * 0.3) },
        ];
      }

      setAiEstimateResult({
        total: estAmount,
        monthly: Math.round(estAmount / targetMonths),
        items
      });

      setNewTarget(estAmount);
      setIsEstimating(false);
    }, 500);
  };

  const handleApplyTemplate = (tpl) => {
    setNewTitle(tpl.title);
    setNewCategory(tpl.category);
    setNewTarget(tpl.amount);
    setAiEstimateResult({
      total: tpl.amount,
      monthly: Math.round(tpl.amount / targetMonths),
      items: [{ name: tpl.breakdown, price: tpl.amount }]
    });
  };

  const handleCreateGoal = () => {
    if (!newTitle || !newTarget) return;
    onAddGoal({
      id: `goal_${Date.now()}`,
      title: newTitle,
      targetAmount: Number(newTarget),
      savedAmount: 0,
      targetDate: '2027-03-01',
      category: newCategory,
      targetMonths: Number(targetMonths)
    });

    setNewTitle('');
    setNewTarget('');
    setAiEstimateResult(null);
    setIsAddModalOpen(false);
  };

  const handleConfirmRealDeposit = () => {
    if (!selectedGoalForDeposit || !depositAmount) return;
    const amountNum = Number(depositAmount);

    onDepositGoal(selectedGoalForDeposit.id, amountNum);

    // Confetti celebration if goal reached
    if ((selectedGoalForDeposit.savedAmount + amountNum) >= selectedGoalForDeposit.targetAmount) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    setSelectedGoalForDeposit(null);
    setDepositAmount('');
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in flex-1 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-primary">
          <Target size={18} className="text-amber-400" />
          <span>夢想目標與 AI 估算存錢規劃</span>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-interactive text-xs font-bold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 flex items-center gap-1 shadow-md"
        >
          <Plus size={14} />
          <span>新增夢想</span>
        </button>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
          const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
          const monthsLeft = goal.targetMonths || 6;
          const aiMonthlyAdvice = Math.round(remaining / monthsLeft);

          return (
            <div key={goal.id} className="glass-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-primary">{goal.title}</h4>
                  <p className="text-11 text-secondary mt-0.5 font-mono">
                    已存 <span className="font-extrabold text-accent-sky">${goal.savedAmount.toLocaleString()}</span> / 目標 <span className="text-muted">${goal.targetAmount.toLocaleString()}</span>
                  </p>
                </div>
                <span className="text-xs font-mono font-extrabold px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">
                  {pct}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-input overflow-hidden p-0.5 border border-card">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* AI Advice & Deposit Trigger */}
              <div className="flex items-center justify-between pt-1">
                <div className="text-11 text-muted flex items-center gap-1">
                  <Sparkles size={13} className="text-amber-400 shrink-0" />
                  <span>AI 建議：每月只需存 <span className="font-bold text-primary font-mono">${aiMonthlyAdvice.toLocaleString()}</span></span>
                </div>
                <button
                  onClick={() => setSelectedGoalForDeposit(goal)}
                  className="btn-interactive text-xs font-bold px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 flex items-center gap-1 shadow-md"
                >
                  <span>真實存入金額</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: 100% 實色不穿透、設計師等級「AI 夢想估價」彈窗 */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          style={{ maxWidth: '440px', margin: '0 auto' }}
        >
          <div
            style={{ backgroundColor: 'var(--bg-main)' }}
            className="w-full border border-[var(--border-color)] rounded-3xl p-5 space-y-4 shadow-2xl animate-slide-up relative max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm text-primary">新增夢想 (AI 智慧估價)</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="btn-interactive p-1.5 rounded-xl bg-input text-secondary hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {/* Template Presets Bar */}
            <div className="space-y-1.5">
              <span className="text-11 text-secondary font-bold flex items-center gap-1">
                <Compass size={13} className="text-accent-sky" />
                不知道市場行情？熱門夢想一鍵估算：
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {DREAM_TEMPLATES.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="btn-interactive p-2 rounded-xl bg-input border border-card text-left hover:border-amber-400 transition-all space-y-0.5"
                  >
                    <div className="text-11 font-bold text-primary truncate">{tpl.title}</div>
                    <div className="text-10 font-mono text-amber-400 font-bold">${tpl.amount.toLocaleString()} 元</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input 1: Dream Title & AI Estimate Button */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-secondary block">1. 夢想名稱或想去的地方：</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="例如：去歐洲自由行、買筆電"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-input text-xs font-bold text-primary border border-card outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleAIEstimate}
                  disabled={isEstimating}
                  className="btn-interactive px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-1 shrink-0 shadow-md"
                >
                  <Sparkles size={14} />
                  <span>{isEstimating ? '估算中...' : 'AI 幫我估價'}</span>
                </button>
              </div>
            </div>

            {/* AI Estimation Result Box */}
            {aiEstimateResult && (
              <div className="bg-input p-3.5 rounded-2xl border border-amber-400/40 space-y-2 text-xs animate-slide-up">
                <div className="flex justify-between items-center border-b border-card/60 pb-2">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    ✨ AI 估算行情與花費明細拆解：
                  </span>
                  <span className="font-mono text-sm font-extrabold text-accent-sky">
                    預估 ${aiEstimateResult.total.toLocaleString()} 元
                  </span>
                </div>

                <div className="space-y-1.5 text-11">
                  {aiEstimateResult.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-secondary">
                      <span>{item.name}</span>
                      <span className="font-mono font-bold text-primary">${item.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-card/60 flex items-center justify-between text-11 text-accent-emerald font-bold">
                  <span>💡 預計在 {targetMonths} 個月內達成：</span>
                  <span className="font-mono font-extrabold text-sm">每月只需存 ${aiEstimateResult.monthly.toLocaleString()} 元</span>
                </div>
              </div>
            )}

            {/* Input 2: Target Amount & Target Months */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary block">2. 目標預算 (TWD)：</label>
                <input
                  type="number"
                  placeholder="例如：75000"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-input text-xs font-mono font-extrabold text-amber-400 border border-card outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary block">3. 預計準備時間：</label>
                <select
                  value={targetMonths}
                  onChange={(e) => setTargetMonths(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-input text-xs font-bold text-primary border border-card outline-none"
                >
                  <option value={3}>3 個月 (速成包)</option>
                  <option value={6}>6 個月 (半年度)</option>
                  <option value={12}>12 個月 (1年計畫)</option>
                  <option value={24}>24 個月 (2年長期)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleCreateGoal}
              className="w-full btn-interactive py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-emerald-400 font-extrabold text-slate-950 text-xs shadow-xl flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={16} />
              <span>確認建立夢想目標</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Real Savings Verification Prompt */}
      {selectedGoalForDeposit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          style={{ maxWidth: '440px', margin: '0 auto' }}
        >
          <div
            style={{ backgroundColor: 'var(--bg-main)' }}
            className="w-full border border-[var(--border-color)] rounded-3xl p-5 space-y-3 relative text-center shadow-2xl"
          >
            <button onClick={() => setSelectedGoalForDeposit(null)} className="btn-interactive absolute top-4 right-4 text-secondary hover:text-primary">
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-1 border border-amber-500/30">
              <ShieldCheck size={26} />
            </div>

            <h3 className="font-bold text-sm text-primary">真實存款轉存確認</h3>
            <p className="text-xs text-secondary">
              欲轉存進 <span className="font-bold text-amber-400">{selectedGoalForDeposit.title}</span>
            </p>

            <input
              type="number"
              placeholder="請輸入本次存入金額 (TWD)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 text-center font-mono font-extrabold text-base rounded-2xl bg-input text-amber-400 border border-card outline-none focus:border-amber-400"
            />

            <div className="p-3 bg-amber-500/10 rounded-2xl text-11 text-amber-400 text-left border border-amber-500/20 leading-relaxed">
              💡 提示：點擊確認後，管家將會從您的【本月可用預算】中扣除這筆金額（視為儲蓄轉存），確保您在現實中能花的錢真的減少，一步步圓夢！
            </div>

            <button
              onClick={handleConfirmRealDeposit}
              disabled={!depositAmount}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-emerald-400 font-extrabold text-slate-950 text-xs shadow-xl disabled:opacity-40"
            >
              我真的轉存了！(寫入並扣除預算)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
