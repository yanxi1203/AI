import { BarChart3, BookOpen, Home, Settings } from 'lucide-react';

const items = [
  { id: 'home', label: '首頁', icon: Home },
  { id: 'ledger', label: '帳本', icon: BookOpen },
  { id: 'analysis', label: '分析', icon: BarChart3 },
  { id: 'settings', label: '設定', icon: Settings }
];

export default function BottomNavigation({ activePage, onNavigate }) {
  return (
    <nav className="bottom-navigation" aria-label="主要導覽">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={activePage === id ? 'is-active' : ''}
          onClick={() => onNavigate(id)}
          aria-current={activePage === id ? 'page' : undefined}
        >
          <Icon size={19} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
