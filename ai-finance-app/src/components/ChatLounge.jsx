import React, { useRef, useEffect } from 'react';
import { Bot, User, Check, Sparkles, Utensils, RotateCw } from 'lucide-react';

export default function ChatLounge({
  messages,
  pendingCard,
  goals,
  onConfirmCard,
  onSwitchIntent,
  onUpdateCardField,
  onSelectFoodOption,
  onRequestFoodMenu
}) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingCard]);

  return (
    <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto w-full" style={{ flex: 1, minHeight: '320px' }}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-2-5 items-start ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
        >
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 shadow-md ${
            msg.sender === 'user'
              ? 'bg-indigo-600 text-white'
              : 'bg-indigo-600 text-white'
          }`}>
            {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
          </div>

          {/* Message Bubble - Compact, short & punchy */}
          <div className={`p-3 rounded-2xl text-xs space-y-2 shadow-sm ${
            msg.sender === 'user'
              ? 'bg-indigo-600 text-white'
              : 'bg-card border border-card text-primary'
          }`} style={{ maxWidth: '84%' }}>
            <div className="font-normal">{msg.text}</div>

            {/* 3 Interactive Food Options & Controls if present */}
            {msg.foodOptions && msg.foodOptions.length > 0 && (
              <div className="space-y-1-5 pt-1">
                {/* Price Tier Switcher */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-10">
                  <button
                    onClick={() => onRequestFoodMenu && onRequestFoodMenu('cheap')}
                    className={`btn-interactive px-2 py-1 rounded-lg border font-bold shrink-0 ${
                      msg.currentTier === 'cheap'
                        ? 'bg-emerald-500-20 text-accent-emerald border-accent-emerald'
                        : 'bg-input text-secondary border-card'
                    }`}
                  >
                    🪙 平價 ($50~$85)
                  </button>
                  <button
                    onClick={() => onRequestFoodMenu && onRequestFoodMenu('normal')}
                    className={`btn-interactive px-2 py-1 rounded-lg border font-bold shrink-0 ${
                      msg.currentTier === 'normal'
                        ? 'bg-sky-500-20 text-accent-sky border-accent-sky'
                        : 'bg-input text-secondary border-card'
                    }`}
                  >
                    🍱 大眾 ($90~$135)
                  </button>
                  <button
                    onClick={() => onRequestFoodMenu && onRequestFoodMenu('luxury')}
                    className={`btn-interactive px-2 py-1 rounded-lg border font-bold shrink-0 ${
                      msg.currentTier === 'luxury'
                        ? 'bg-amber-500-20 text-amber-400 border-amber-400'
                        : 'bg-input text-secondary border-card'
                    }`}
                  >
                    🎉 奢華 ($150+)
                  </button>
                </div>

                {/* 3 Food Option Cards */}
                <div className="space-y-1-5">
                  {msg.foodOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectFoodOption && onSelectFoodOption(opt)}
                      className="w-full btn-interactive p-2-5 rounded-xl bg-input border border-amber-500-20 hover:border-amber-400 text-left flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="p-1-5 rounded-lg bg-amber-500-20 text-amber-400 shrink-0">
                          <Utensils size={14} />
                        </span>
                        <div>
                          <div className="font-bold text-xs text-primary">{opt.title}</div>
                          <div className="text-10 text-secondary">{opt.emotion}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-extrabold text-amber-400 text-xs">${opt.amount}</div>
                        <span className="text-10 text-accent-sky font-bold">點擊記帳 ➔</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Refresh 3 More Button */}
                <button
                  onClick={() => onRequestFoodMenu && onRequestFoodMenu(msg.currentTier || 'cheap')}
                  className="w-full btn-interactive py-1-5 rounded-xl bg-sky-500-10 text-accent-sky border border-sky-500-30 font-bold text-11 flex items-center justify-center gap-1"
                >
                  <RotateCw size={13} />
                  <span>不滿意？點擊再換 3 個美食菜單！</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Pending Micro Confirmation Card (Interactive NLP result) */}
      {pendingCard && (
        <div className="my-3 p-4 glass-card border border-sky-500-30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-11 font-bold text-accent-sky flex items-center gap-1">
              <Sparkles size={13} />
              AI 辨識結果確認
            </span>
            <span className="text-10 text-muted">點擊標籤可秒切換意圖</span>
          </div>

          {/* 1-Click Intent Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1-5 mb-3 bg-input p-1 rounded-xl">
            <button
              onClick={() => onSwitchIntent('expense')}
              className={`py-1 rounded-lg text-xs font-bold btn-interactive ${
                pendingCard.type === 'expense'
                  ? 'bg-rose-500-20 text-rose-400 border border-rose-400'
                  : 'text-secondary'
              }`}
            >
              💸 日常支出
            </button>
            <button
              onClick={() => onSwitchIntent('goal')}
              className={`py-1 rounded-lg text-xs font-bold btn-interactive ${
                pendingCard.type === 'goal'
                  ? 'bg-amber-500-20 text-amber-400 border border-amber-400'
                  : 'text-secondary'
              }`}
            >
              🎯 存錢夢想
            </button>
            <button
              onClick={() => onSwitchIntent('income')}
              className={`py-1 rounded-lg text-xs font-bold btn-interactive ${
                pendingCard.type === 'income'
                  ? 'bg-emerald-500-20 text-accent-emerald border border-accent-emerald'
                  : 'text-secondary'
              }`}
            >
              💰 收入
            </button>
          </div>

          {/* Editable Fields */}
          <div className="space-y-2 text-xs bg-input p-3 rounded-xl mb-3 border border-card">
            {pendingCard.type === 'goal' && (
              <div className="flex justify-between items-center">
                <span className="text-secondary">儲蓄目標</span>
                <select
                  value={pendingCard.goalId || ''}
                  onChange={(e) => onUpdateCardField('goalId', e.target.value)}
                  className="bg-card text-xs text-primary rounded-lg px-2 py-1 outline-none border border-card"
                  aria-label="選擇儲蓄目標"
                >
                  {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-secondary">項目名稱：</span>
              <input
                type="text"
                value={pendingCard.title}
                onChange={(e) => onUpdateCardField('title', e.target.value)}
                className="bg-transparent text-right font-bold text-primary outline-none border-b border-card px-1 py-0-5"
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-secondary">金額 (TWD)：</span>
              <input
                type="number"
                value={pendingCard.amount}
                onChange={(e) => onUpdateCardField('amount', Number(e.target.value))}
                className="bg-transparent text-right font-mono font-extrabold text-base text-accent-sky outline-none border-b border-card px-1 py-0-5"
                style={{ width: '90px' }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-secondary">消費分類：</span>
              <select
                value={pendingCard.category}
                onChange={(e) => onUpdateCardField('category', e.target.value)}
                className="bg-card text-xs text-primary rounded-lg px-2 py-1 outline-none border border-card"
              >
                <option value="飲食">飲食 🍱</option>
                <option value="交通">交通 🚌</option>
                <option value="娛樂">娛樂 🎮</option>
                <option value="日常">日常 🏠</option>
                <option value="學習">學習 📚</option>
                <option value="固定支出">固定支出 💳</option>
                <option value="薪水收入">薪水收入 💰</option>
                <option value="儲蓄夢想">儲蓄夢想 🎯</option>
              </select>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-secondary">情緒消費原因：</span>
              <select
                value={pendingCard.emotion}
                onChange={(e) => onUpdateCardField('emotion', e.target.value)}
                className="bg-card text-xs text-primary rounded-lg px-2 py-1 outline-none border border-card"
              >
                <option value="日常剛需 🏠">日常剛需 🏠</option>
                <option value="犒賞自己 🎉">犒賞自己 🎉</option>
                <option value="衝動消費 💸">衝動消費 💸</option>
              </select>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={onConfirmCard}
            className="w-full btn-interactive py-2 rounded-xl bg-sky-500-20 text-accent-sky border border-sky-500-30 font-bold text-xs flex items-center justify-center gap-1-5"
          >
            <Check size={16} />
            <span>確認寫入帳本資料庫</span>
          </button>
        </div>
      )}

      <div ref={chatEndRef} />
    </div>
  );
}
