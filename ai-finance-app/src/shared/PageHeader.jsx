import { ChevronLeft } from 'lucide-react';

export default function PageHeader({ eyebrow, title, onBack, action }) {
  return (
    <header className="subpage-header">
      {onBack && (
        <button type="button" className="icon-button" onClick={onBack} aria-label="返回上一頁">
          <ChevronLeft size={20} />
        </button>
      )}
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {action && <div className="subpage-header__action">{action}</div>}
    </header>
  );
}
