import React from 'react';
import { Wallet, CreditCard, Calendar, ChevronRight } from 'lucide-react';

export default function MetricsCards({ metrics, onOpenLedger }) {
  const isOverbudget = metrics.monthRemaining < 0;

  return (
    <div className="px-4 py-3 grid grid-cols-3 gap-2-5">
      {/* 1. Today Available Card */}
      <div className="glass-card p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-secondary mb-1">
          <span className="text-11 font-medium">今日可用</span>
          <Wallet size={14} className="text-accent-sky" />
        </div>
        <div>
          <div className="text-base font-extrabold text-accent-sky tracking-tight">
            ${Math.max(0, Math.round(metrics.todayAvailable)).toLocaleString()}
          </div>
          <p className="text-10 text-muted mt-0-5">日均動態分配</p>
        </div>
      </div>

      {/* 2. Today Spent Card (Clickable to jump to Ledger View!) */}
      <div
        onClick={onOpenLedger}
        className="glass-card p-3 flex flex-col justify-between cursor-pointer border border-card"
        title="點擊查看今日詳細帳冊紀錄"
      >
        <div className="flex items-center justify-between text-secondary mb-1">
          <span className="text-11 font-medium">今日支出</span>
          <CreditCard size={14} className="text-amber-400" />
        </div>
        <div>
          <div className="text-base font-extrabold text-amber-400 tracking-tight flex items-center justify-between">
            <span>${metrics.todaySpent.toLocaleString()}</span>
            <ChevronRight size={14} className="text-accent-sky" />
          </div>
          <p className="text-10 text-accent-sky mt-0-5">點擊看明細 ➔</p>
        </div>
      </div>

      {/* 3. Month Remaining Budget Card */}
      <div className={`glass-card p-3 flex flex-col justify-between ${isOverbudget ? 'bg-rose-500-20' : ''}`}>
        <div className="flex items-center justify-between text-secondary mb-1">
          <span className="text-11 font-medium">本月剩餘</span>
          <Calendar size={14} className={isOverbudget ? 'text-red-400' : 'text-accent-emerald'} />
        </div>
        <div>
          <div className={`text-base font-extrabold tracking-tight ${isOverbudget ? 'text-red-400' : 'text-accent-emerald'}`}>
            ${metrics.monthRemaining.toLocaleString()}
          </div>
          <p className="text-10 text-muted mt-0-5">預算 ${metrics.monthlyBudget.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
