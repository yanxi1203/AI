import React, { useState } from 'react';
import { Home, BookOpen, BarChart3, Target, Settings, Compass, X } from 'lucide-react';

export default function BottomNav({ activeTab, onSelectTab, isHidden }) {
  const [isOpen, setIsOpen] = useState(false);

  // 5 Pure Icon Tabs evenly spread over 110-degree 1/4 arc
  const tabs = [
    { id: 'home', label: '首頁', icon: Home, angle: 180 },        // Direct Left
    { id: 'ledger', label: '帳本', icon: BookOpen, angle: 157.5 },  // Top-Left 1
    { id: 'analytics', label: '分析', icon: BarChart3, angle: 135 },// Top-Left 2 (45 deg)
    { id: 'goals', label: '夢想', icon: Target, angle: 112.5 },   // Top-Left 3
    { id: 'settings', label: '設定', icon: Settings, angle: 90 }, // Direct Top
  ];

  const radius = 135; // Spacious fan radius in pixels

  // Dynamic bottom positioning: on Home view elevate above input bar (82px), on other views (24px)
  const bottomPos = activeTab === 'home' ? '82px' : '28px';

  if (isHidden) return null; // Completely hide floating compass ball when any modal is open!

  return (
    <>
      {/* Semi-transparent Backdrop when Fan Menu is Open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(5px)',
          }}
        />
      )}

      {/* Floating Ball & Arc Fan Menu Container */}
      <div
        className="floating-nav-anchor"
        style={{
          position: 'fixed',
          bottom: bottomPos,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'bottom 0.3s ease, opacity 0.2s ease',
        }}
      >
        <div style={{ position: 'relative' }}>
          {/* 1/4 Fan Arc Pure Icon Circles */}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            // Polar angle to Cartesian offset
            const rad = (tab.angle * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = -Math.sin(rad) * radius;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  setIsOpen(false);
                }}
                className="btn-interactive"
                style={{
                  position: 'absolute',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isActive ? '2px solid #ffffff' : '1px solid rgba(148, 163, 184, 0.3)',
                  background: isActive
                    ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
                    : '#1e293b',
                  color: '#ffffff',
                  boxShadow: isActive
                    ? '0 0 20px rgba(56, 189, 248, 0.8), 0 4px 12px rgba(0,0,0,0.5)'
                    : '0 6px 18px rgba(0,0,0,0.5)',
                  left: isOpen ? `${x}px` : '0px',
                  top: isOpen ? `${y}px` : '0px',
                  opacity: isOpen ? 1 : 0,
                  transform: isOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.2)',
                  pointerEvents: isOpen ? 'auto' : 'none',
                  transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  cursor: 'pointer',
                }}
                title={tab.label}
                aria-label={tab.label}
              >
                <Icon size={22} color="#ffffff" />
              </button>
            );
          })}

          {/* Main Floating Trigger Ball - Vibrant Glowing Neon Gradient */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="btn-interactive"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              color: '#ffffff',
              background: isOpen
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #38bdf8 0%, #4f46e5 50%, #c084fc 100%)',
              boxShadow: isOpen
                ? '0 0 25px rgba(239, 68, 68, 0.7), 0 8px 24px rgba(0,0,0,0.5)'
                : '0 0 25px rgba(56, 189, 248, 0.7), 0 8px 24px rgba(0,0,0,0.5)',
              cursor: 'pointer',
              transition: 'all 0.35s ease',
              transform: isOpen ? 'rotate(90deg) scale(1.05)' : 'scale(1)',
            }}
            title="點擊展開 1/4 扇形圖示選單"
            aria-label={isOpen ? '關閉導覽選單' : '開啟導覽選單'}
          >
            {isOpen ? <X size={26} color="#ffffff" /> : <Compass size={26} color="#ffffff" />}
          </button>
        </div>
      </div>

      {/* Anchor styles for Desktop & Mobile positioning */}
      <style>{`
        .floating-nav-anchor {
          right: calc(50vw - 195px) !important;
        }
        @media (max-width: 640px) {
          .floating-nav-anchor {
            right: 20px !important;
          }
        }
      `}</style>
    </>
  );
}
