import React, { useState } from 'react';
import { Settings, Save, Bot, RefreshCw, Barcode, Sun, Moon, CheckCircle2, ShieldAlert, Sparkles, Download } from 'lucide-react';

export default function SettingsView({
  settings,
  budget,
  barcode,
  theme,
  onSaveSettings,
  onSaveBudget,
  onSaveBarcode,
  onToggleTheme,
  onResetData
}) {
  const [name, setName] = useState(settings.name || 'Fin');
  const [tone, setTone] = useState(settings.tone || 'tsundere');
  const [monthlyBudget, setMonthlyBudget] = useState(budget || 15000);
  const [carrierBarcode, setCarrierBarcode] = useState(barcode || '/AB12345');
  const [enableAlert, setEnableAlert] = useState(settings.enableAlert !== false);
  const [showToast, setShowToast] = useState(false);

  const handleToneChange = (newTone) => {
    setTone(newTone);
    // Instant live update so Header changes Butler persona immediately!
    onSaveSettings({ ...settings, name, tone: newTone, enableAlert });
  };

  const handleSaveAll = () => {
    onSaveSettings({ ...settings, name, tone, enableAlert });
    onSaveBudget(Number(monthlyBudget));
    onSaveBarcode(carrierBarcode);

    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleExportData = () => {
    const backupData = {
      settings: { name, tone, enableAlert },
      budget: monthlyBudget,
      barcode: carrierBarcode,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Butler_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in flex-1 pb-28">
      {/* Toast Notification Banner */}
      {showToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl font-extrabold text-xs shadow-2xl flex items-center gap-2 animate-slide-up border border-emerald-300">
          <CheckCircle2 size={16} />
          <span>所有個人化設定已成功儲存！</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between text-sm font-bold text-primary">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-accent-sky" />
          <span>管家人格與系統偏好設定</span>
        </div>
        <span className="text-10 text-muted font-mono bg-input px-2.5 py-1 rounded-full border border-card">
          v2.0 智能版
        </span>
      </div>

      {/* SECTION 1: AI 管家人格偏好 (Persona & Tone) */}
      <div className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-card pb-2.5">
          <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Bot size={16} className="text-accent-sky" />
            <span>AI 管家人格與對話風格</span>
          </h4>
          <span className="text-10 text-accent-sky font-bold bg-sky-500-20 px-2 py-0.5 rounded-full border border-sky-500-30">
            即時生效
          </span>
        </div>

        {/* Butler Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary block">管家專屬名稱：</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：Fin / 小智 / 柴柴管家"
            className="w-full px-3.5 py-2.5 rounded-2xl bg-input text-xs font-bold text-primary border border-card focus:border-sky-500 outline-none transition-all"
          />
        </div>

        {/* Butler Personality Options with High-Contrast Clickable Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-secondary block">選擇管家對話風格：</label>
          <div className="grid grid-cols-3 gap-2">
            {/* Tone Option 1: 傲嬌可靠 */}
            <button
              type="button"
              onClick={() => handleToneChange('tsundere')}
              className={`btn-interactive py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                tone === 'tsundere'
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-extrabold shadow-lg shadow-sky-500/20 scale-105'
                  : 'bg-input text-secondary border-card hover:text-primary hover:bg-card'
              }`}
            >
              <span className="text-base">😼</span>
              <span className="text-xs">傲嬌可靠</span>
            </button>

            {/* Tone Option 2: 溫柔陪伴 */}
            <button
              type="button"
              onClick={() => handleToneChange('gentle')}
              className={`btn-interactive py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                tone === 'gentle'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20 scale-105'
                  : 'bg-input text-secondary border-card hover:text-primary hover:bg-card'
              }`}
            >
              <span className="text-base">🌸</span>
              <span className="text-xs">溫柔陪伴</span>
            </button>

            {/* Tone Option 3: 嚴格把關 */}
            <button
              type="button"
              onClick={() => handleToneChange('strict')}
              className={`btn-interactive py-3 px-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                tone === 'strict'
                  ? 'bg-rose-500 text-white border-rose-400 font-extrabold shadow-lg shadow-rose-500/20 scale-105'
                  : 'bg-input text-secondary border-card hover:text-primary hover:bg-card'
              }`}
            >
              <span className="text-base">🛡️</span>
              <span className="text-xs">嚴格把關</span>
            </button>
          </div>

          <p className="text-10 text-muted pt-1">
            {tone === 'tsundere' && '💡 傲嬌風格：平時愛碎碎唸，但會默默幫您守護荷包！'}
            {tone === 'gentle' && '💡 溫柔風格：暖心鼓勵每一筆理財進步，帶來療癒感！'}
            {tone === 'strict' && '💡 嚴格風格：鐵面無私管家，超過預算會果斷發出警告！'}
          </p>
        </div>
      </div>

      {/* SECTION 2: 預算與財務警示設定 (Budget & Alerts) */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-card pb-2.5">
          <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
            <ShieldAlert size={16} className="text-amber-400" />
            <span>每月預算與控管警示</span>
          </h4>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary block">每月總預算上限 (TWD)：</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-accent-sky">$</span>
            <input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              className="w-full pl-8 pr-3.5 py-2.5 font-mono font-extrabold text-base rounded-2xl bg-input text-accent-sky border border-card focus:border-sky-500 outline-none"
            />
          </div>
        </div>

        {/* Alert Toggle Switch */}
        <div className="flex items-center justify-between bg-input p-3 rounded-2xl border border-card">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-primary block">⚡ 80% 預算超支自動警示</span>
            <span className="text-10 text-muted block">當月開銷達預算 80% 時發出警告</span>
          </div>
          <button
            type="button"
            onClick={() => setEnableAlert(!enableAlert)}
            className={`w-12 h-6 rounded-full transition-colors p-0.5 relative ${
              enableAlert ? 'bg-sky-500' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                enableAlert ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="bg-input p-3 rounded-xl border border-card text-10 text-muted space-y-1">
          <span className="font-bold text-accent-sky flex items-center gap-1">
            💡 今日可用金額算式：
          </span>
          <p className="font-mono">
            (當月總預算 - 當月已花費) ÷ 當月剩餘天數
          </p>
        </div>
      </div>

      {/* SECTION 3: 電子發票與載具條碼設定 (E-Invoice Barcode) */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-card pb-2.5">
          <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Barcode size={16} className="text-accent-sky" />
            <span>手機載具條碼設定</span>
          </h4>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary block">電子發票手機條碼：</label>
          <input
            type="text"
            value={carrierBarcode}
            onChange={(e) => setCarrierBarcode(e.target.value)}
            placeholder="例如：/AB12345"
            className="w-full px-3.5 py-2.5 font-mono font-bold text-xs rounded-2xl bg-input text-primary border border-card focus:border-sky-500 outline-none"
          />
          <p className="text-10 text-muted">
            設定後會顯示在頂部 Header 與電子發票感應頁面，方利掃碼結帳！
          </p>
        </div>
      </div>

      {/* SECTION 4: 系統視覺主題切換 (Theme Switcher) */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-card pb-2.5">
          <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Sparkles size={16} className="text-amber-400" />
            <span>系統介面視覺主題</span>
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => theme !== 'dark' && onToggleTheme()}
            className={`p-3 rounded-2xl border flex items-center justify-center gap-2 transition-all ${
              theme === 'dark'
                ? 'bg-slate-800 text-sky-400 border-sky-400 font-extrabold shadow-md'
                : 'bg-input text-secondary border-card hover:text-primary'
            }`}
          >
            <Moon size={16} className="text-sky-400" />
            <span>🌙 深夜黑桃</span>
          </button>

          <button
            type="button"
            onClick={() => theme !== 'light' && onToggleTheme()}
            className={`p-3 rounded-2xl border flex items-center justify-center gap-2 transition-all ${
              theme === 'light'
                ? 'bg-amber-100 text-amber-900 border-amber-400 font-extrabold shadow-md'
                : 'bg-input text-secondary border-card hover:text-primary'
            }`}
          >
            <Sun size={16} className="text-amber-500" />
            <span>☀️ 清晨燕麥</span>
          </button>
        </div>
      </div>

      {/* SECTION 5: 儲存與資料管理按鈕 */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleSaveAll}
          className="w-full btn-interactive py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl hover:opacity-95"
        >
          <Save size={16} />
          <span>儲存所有設定變更</span>
        </button>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={handleExportData}
            className="btn-interactive py-2.5 rounded-xl bg-input text-secondary border border-card hover:text-primary flex items-center justify-center gap-1.5 font-bold"
          >
            <Download size={14} />
            <span>備份 JSON 設定</span>
          </button>

          <button
            type="button"
            onClick={onResetData}
            className="btn-interactive py-2.5 rounded-xl bg-rose-500-10 text-rose-400 border border-rose-500-20 hover:bg-rose-500-20 flex items-center justify-center gap-1.5 font-bold"
          >
            <RefreshCw size={14} />
            <span>重置預設資料</span>
          </button>
        </div>
      </div>
    </div>
  );
}
