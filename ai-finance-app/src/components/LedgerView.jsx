import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Download, Filter, Trash2, Plus, ChevronLeft, ChevronRight, X, Check, ChevronDown } from 'lucide-react';
import { exportTransactionsToCSV } from '../utils/csvExporter';

export default function LedgerView({ transactions, onDeleteTransaction, onOpenAddModal, onModalStateChange }) {
  const monthsList = [
    { key: '2026-08', label: '2026 年 8 月', isCurrent: true },
    { key: '2026-07', label: '2026 年 7 月', isCurrent: false },
    { key: '2026-06', label: '2026 年 6 月', isCurrent: false },
    { key: '2026-05', label: '2026 年 5 月', isCurrent: false },
  ];

  const [monthIndex, setMonthIndex] = useState(0); // Default to '2026-08'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const popoverRef = useRef(null);

  // Click outside listener for Popover menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsPopoverOpen(false);
      }
    }
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Notify parent if modal is open to hide floating compass ball!
  useEffect(() => {
    if (onModalStateChange) {
      onModalStateChange(isMonthPickerOpen);
    }
  }, [isMonthPickerOpen, onModalStateChange]);

  const currentMonthObj = monthsList[monthIndex] || monthsList[0];
  const selectedMonth = currentMonthObj.key;

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (monthIndex < monthsList.length - 1) setMonthIndex(monthIndex + 1);
  };

  const handleNextMonth = () => {
    if (monthIndex > 0) setMonthIndex(monthIndex - 1);
  };

  // Filter by Month & Category Tag
  const filteredTxs = transactions.filter((t) => {
    const monthMatch = t.date.startsWith(selectedMonth);
    const categoryMatch =
      selectedCategory === 'all' || t.category === selectedCategory;
    return monthMatch && categoryMatch;
  });

  // Group by Date
  const groupedTxs = filteredTxs.reduce((acc, t) => {
    acc[t.date] = acc[t.date] || [];
    acc[t.date].push(t);
    return acc;
  }, {});

  // Monthly totals
  const totalExpense = filteredTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = filteredTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleExport = () => {
    exportTransactionsToCSV(filteredTxs);
  };

  // Category items
  const categoryList = [
    { id: 'all', label: '全部類別', icon: '📂' },
    { id: '飲食', label: '飲食', icon: '🍱' },
    { id: '交通', label: '交通', icon: '🚌' },
    { id: '娛樂', label: '娛樂', icon: '🎮' },
    { id: '日常', label: '日常', icon: '🏠' },
    { id: '學習', label: '學習', icon: '📚' },
    { id: '固定支出', label: '固定支出', icon: '💳' },
    { id: '儲蓄夢想', label: '儲蓄夢想', icon: '🎯' },
  ];

  const categoryIcons = {
    '飲食': '🍱',
    '交通': '🚌',
    '娛樂': '🎮',
    '日常': '🏠',
    '學習': '📚',
    '固定支出': '💳',
    '薪水收入': '💰',
    '儲蓄夢想': '🎯'
  };

  const currentCategoryObj = categoryList.find(c => c.id === selectedCategory) || categoryList[0];

  return (
    <div className="p-4 space-y-4 flex-1 pb-28 animate-fade-in">
      {/* 1. Month Switcher Header */}
      <div className="flex items-center justify-center py-2.5">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            disabled={monthIndex === monthsList.length - 1}
            className={`btn-interactive p-2 rounded-xl flex items-center justify-center transition-all ${
              monthIndex === monthsList.length - 1
                ? 'text-muted opacity-30 cursor-not-allowed'
                : 'bg-input text-accent-sky border border-card hover:bg-sky-500-20'
            }`}
            title="上一個月"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Clickable Month Label -> Opens Month Picker */}
          <button
            onClick={() => setIsMonthPickerOpen(true)}
            className="btn-interactive flex items-center gap-2 px-3 py-1-5 rounded-xl bg-input border border-card text-primary hover:bg-sky-500-20 transition-all outline-none"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)' }}
            title="點擊開啟手機快速月份選擇視窗"
          >
            <Calendar size={16} className="text-accent-sky shrink-0" />
            <span className="text-xs font-extrabold text-primary tracking-tight whitespace-nowrap">
              {currentMonthObj.label} {currentMonthObj.isCurrent ? '(當月)' : '(歷史)'}
            </span>
          </button>

          <button
            onClick={handleNextMonth}
            disabled={monthIndex === 0}
            className={`btn-interactive p-2 rounded-xl flex items-center justify-center transition-all ${
              monthIndex === 0
                ? 'text-muted opacity-30 cursor-not-allowed'
                : 'bg-input text-accent-sky border border-card hover:bg-sky-500-20'
            }`}
            title="下一個月"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* 2. Month Totals Banner with Integrated [📥 匯出 CSV] Badge */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-card pb-2-5">
          <span className="text-xs font-bold text-primary">本月財務總覽</span>
          <button
            onClick={handleExport}
            className="btn-interactive flex items-center gap-1 text-[11px] font-bold px-2-5 py-1.5 rounded-xl bg-sky-500-20 text-accent-sky border border-sky-500-30"
            title="匯出 Excel UTF-8 BOM CSV 帳冊"
          >
            <Download size={13} />
            <span>匯出 CSV 帳冊</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center pt-1">
          <div className="border-r border-card pr-3">
            <span className="text-11 text-secondary block mb-1">本月總支出</span>
            <span className="text-xl font-mono font-extrabold text-rose-400">
              ${totalExpense.toLocaleString()}
            </span>
          </div>
          <div className="pl-3">
            <span className="text-11 text-secondary block mb-1">本月總收入</span>
            <span className="text-xl font-mono font-extrabold text-accent-emerald">
              ${totalIncome.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 3. In-Context Inline Popover Dropdown (顏色 100% 抓修：深色質感底色 + 清晰深白對比) */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center gap-1.5 text-xs text-secondary font-bold">
          <Filter size={14} className="text-accent-sky" />
          <span>帳冊明細列表</span>
        </div>

        {/* Relative Container for Floating Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-input border border-card hover:border-sky-500-30 transition-all text-xs font-bold text-primary shadow-sm"
          >
            <span className="text-sm">{currentCategoryObj.icon}</span>
            <span className="text-accent-sky font-extrabold">{currentCategoryObj.label}</span>
            <ChevronDown size={14} className={`text-muted transition-transform duration-200 ${isPopoverOpen ? 'rotate-180 text-accent-sky' : ''}`} />
          </button>

          {/* Floating Popover Menu with Explicit Dark Background & Clear White Text Contrast */}
          {isPopoverOpen && (
            <div
              style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
              className="absolute right-0 top-full mt-2 w-48 border rounded-2xl p-1.5 shadow-2xl z-40 space-y-1 animate-scale-in"
            >
              {categoryList.map((cObj) => {
                const isSelected = selectedCategory === cObj.id;
                return (
                  <button
                    key={cObj.id}
                    onClick={() => {
                      setSelectedCategory(cObj.id);
                      setIsPopoverOpen(false);
                    }}
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-input)' : 'transparent',
                      color: isSelected ? '#38bdf8' : 'var(--text-primary)'
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors font-bold ${
                      isSelected
                        ? 'border border-sky-500/30'
                        : 'hover:bg-input hover:text-sky-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{cObj.icon}</span>
                      <span className="tracking-wide">{cObj.label}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-accent-sky" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Transaction List Grouped by Date */}
      {Object.keys(groupedTxs).length === 0 ? (
        <div className="glass-card p-8 text-center space-y-3 my-4">
          <p className="text-xs text-secondary">該類別條件下尚無帳冊紀錄</p>
          <button
            onClick={onOpenAddModal}
            className="btn-interactive px-4 py-2 rounded-xl bg-sky-500-20 text-accent-sky font-bold text-xs inline-flex items-center gap-1.5"
          >
            <Plus size={15} />
            <span>返回首頁記一筆</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTxs)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .map(([dateStr, items]) => (
              <div key={dateStr} className="space-y-2-5">
                <div className="text-xs font-bold font-mono text-secondary px-1 flex items-center justify-between">
                  <span>📅 {dateStr}</span>
                  <span className="text-10 text-muted font-normal">
                    共 {items.length} 筆
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((item) => {
                    const icon = categoryIcons[item.category] || '📦';
                    const isExpense = item.type === 'expense';
                    return (
                      <div
                        key={item.id}
                        className="glass-card p-4 flex items-center justify-between border border-card hover:border-sky-500-30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl p-2-5 rounded-xl bg-input border border-card shrink-0">
                            {icon}
                          </span>
                          <div className="space-y-1">
                            <div className="font-bold text-xs text-primary">
                              {item.title}
                            </div>
                            <span className="px-2 py-0-5 rounded-md bg-input text-secondary border border-card text-11 font-medium inline-block">
                              {item.category}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`font-mono font-extrabold text-sm ${
                              isExpense ? 'text-rose-400' : 'text-accent-emerald'
                            }`}
                          >
                            {isExpense ? '-' : '+'}${item.amount.toLocaleString()}
                          </span>
                          <button
                            onClick={() => onDeleteTransaction(item.id)}
                            className="btn-interactive p-2 rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500-10 transition-all"
                            title="刪除此筆紀錄"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* 5. Mobile Native Bottom Sheet Modal: Month Selector */}
      {isMonthPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md animate-fade-in"
          style={{
            maxWidth: '440px',
            margin: '0 auto',
            left: 0,
            right: 0,
          }}
        >
          <div
            className="w-full border-t border-[var(--border-color)] rounded-t-3xl p-5 space-y-4 shadow-2xl animate-slide-up"
            style={{
              backgroundColor: 'var(--bg-main)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-accent-sky" />
                <h3 className="font-bold text-sm text-primary">選擇欲查看的帳冊月份</h3>
              </div>
              <button
                onClick={() => setIsMonthPickerOpen(false)}
                className="btn-interactive p-1-5 rounded-xl bg-input text-secondary hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              {monthsList.map((mObj, idx) => (
                <button
                  key={mObj.key}
                  onClick={() => {
                    setMonthIndex(idx);
                    setIsMonthPickerOpen(false);
                  }}
                  className={`w-full btn-interactive p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    monthIndex === idx
                      ? 'bg-sky-500-20 text-accent-sky border-sky-500-30 font-bold shadow-md'
                      : 'bg-input text-primary border-card hover:bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-primary">{mObj.label}</span>
                    {mObj.isCurrent && (
                      <span className="text-10 px-2 py-0-5 rounded-full bg-sky-500-20 text-accent-sky font-bold border border-sky-500-30">
                        當月
                      </span>
                    )}
                  </div>
                  {monthIndex === idx && <Check size={16} className="text-accent-sky" />}
                </button>
              ))}
            </div>

            <p className="text-10 text-muted text-center pt-1 pb-2">
              點擊任意月份即可一鍵切換該月份帳冊明細
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
