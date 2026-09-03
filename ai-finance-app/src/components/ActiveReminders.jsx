import React from 'react';
import { Bus, AlertCircle, Check } from 'lucide-react';

export default function ActiveReminders({ onQuickLogBus, onConfirmBill, recurringList = [] }) {
  const isWeekday = new Date().getDay() >= 1 && new Date().getDay() <= 5;
  const billPrompt = recurringList.find(r => r.frequency === 'monthly');

  return (
    <div className="px-4 py-1 space-y-2">
      {/* 1. Weekday Bus 1-Tap Shortcut Card */}
      {isWeekday && (
        <div className="glass-card p-3 bg-sky-500-10 border border-sky-500-30 flex items-center justify-between">
          <div className="flex items-center gap-2-5">
            <div className="p-2 rounded-xl bg-sky-500-20 text-accent-sky">
              <Bus size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-primary">平日公車搭乘提醒</h4>
              <p className="text-11 text-secondary">今天有搭公車上學/上班嗎？</p>
            </div>
          </div>
          <button
            onClick={() => onQuickLogBus(15)}
            className="btn-interactive text-xs font-bold px-3 py-1-5 rounded-xl bg-sky-500-20 text-accent-sky border border-sky-500-30 flex items-center gap-1"
          >
            <span>一鍵 -$15</span>
          </button>
        </div>
      )}

      {/* 2. Monthly Bill Due Reminder */}
      {billPrompt && (
        <div className="glass-card p-3 bg-amber-500-10 border border-amber-500-20 flex items-center justify-between">
          <div className="flex items-center gap-2-5">
            <div className="p-2 rounded-xl bg-amber-500-20 text-amber-400">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-primary">{billPrompt.title} 繳費提醒</h4>
              <p className="text-11 text-secondary">月結金額 ${billPrompt.amount.toLocaleString()} 元</p>
            </div>
          </div>
          <button
            onClick={() => onConfirmBill(billPrompt)}
            className="btn-interactive text-xs font-bold px-3 py-1-5 rounded-xl bg-amber-400 text-slate-950 flex items-center gap-1"
          >
            <Check size={14} />
            <span>已繳費寫入</span>
          </button>
        </div>
      )}
    </div>
  );
}
