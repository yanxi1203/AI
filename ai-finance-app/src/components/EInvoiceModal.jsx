import React from 'react';
import { X, Barcode, RefreshCw } from 'lucide-react';

export default function EInvoiceModal({ isOpen, onClose, barcode, onSimulateCarrierSync }) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div className="w-full glass-card p-6 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-[var(--accent-sky)] flex items-center justify-center mx-auto mb-3">
            <Barcode size={28} />
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">電子發票載具條碼</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">結帳時提供店家掃描，免列印紙本發票</p>

          {/* Barcode Display Box */}
          <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-sky-400 mb-4 shadow-inner">
            {/* Simulated Barcode lines */}
            <div className="h-14 bg-black flex items-center justify-between px-2 overflow-hidden mb-2 rounded">
              <div className="w-full h-full flex justify-between items-center space-x-1">
                {[4, 2, 6, 1, 3, 5, 2, 7, 1, 4, 3, 2, 6, 1, 4, 2, 5, 1, 3, 2, 6, 4].map((width, i) => (
                  <div key={i} className={`h-full bg-white`} style={{ width: `${width * 2}px` }} />
                ))}
              </div>
            </div>
            <p className="font-mono text-lg font-bold text-gray-800 tracking-wider">{barcode}</p>
          </div>

          {/* Sync Trigger */}
          <button
            onClick={() => {
              onSimulateCarrierSync();
              onClose();
            }}
            className="w-full btn-interactive py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg"
          >
            <RefreshCw size={16} />
            <span>一鍵同步最新載具發票進對話</span>
          </button>
        </div>
      </div>
    </div>
  );
}
