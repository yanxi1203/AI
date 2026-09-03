import React from 'react';
import { Sun, Moon, Barcode, Bot } from 'lucide-react';

export default function Header({ theme, onToggleTheme, onOpenBarcode, settings, metrics, barcode }) {
  const toneLabelMap = {
    tsundere: '傲嬌陪伴 😼',
    gentle: '溫柔陪伴 🌸',
    strict: '嚴格把關 🛡️'
  };

  return (
    <header className="sticky top-0 z-30 px-4 py-3 bg-card border-b border-card flex items-center justify-between backdrop-blur-md">
      {/* Butler Info & Name */}
      <div className="flex items-center gap-2-5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shrink-0 shadow-md">
          <Bot size={22} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-sm text-primary">AI 管家 {settings.name || 'Fin'}</h1>
            <span className="text-10 px-2 py-0.5 rounded-full bg-sky-500-20 text-accent-sky font-extrabold border border-sky-500-30">
              {toneLabelMap[settings.tone] || '傲嬌陪伴 😼'}
            </span>
          </div>
          <p className="text-11 text-secondary">
            {metrics.monthRemaining < 0 ? '⚠️ 預算告急控管中' : '✨ 財務狀況良好'}
          </p>
        </div>
      </div>

      {/* Action Controls: Theme Switcher & Carrier Barcode */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenBarcode}
          className="btn-interactive flex items-center gap-1 text-xs px-2-5 py-1.5 rounded-xl bg-sky-500-10 text-accent-sky font-mono font-bold border border-sky-500-30"
          title="點擊顯示電子發票載具條碼"
        >
          <Barcode size={15} />
          <span>{barcode || '/AB12345'}</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="btn-interactive p-2 rounded-xl bg-input text-primary border border-card flex items-center justify-center"
          title={theme === 'dark' ? '切換至淺色模式' : '切換至深色模式'}
        >
          {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-600" />}
        </button>
      </div>
    </header>
  );
}
