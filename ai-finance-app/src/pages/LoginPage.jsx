import { Info, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import FinMascot from '../shared/FinMascot.jsx';
import { LOGIN_CONTENT } from '../modules/auth/authViewModel.js';

const LEGAL_COPY = {
  guest: {
    title: '訪客資料說明',
    body: '訪客資料會綁定這次建立的匿名帳號，並保留在此瀏覽器。清除瀏覽器資料、改用其他裝置或登出後，可能無法回到同一個訪客帳號。'
  },
  terms: {
    title: '服務條款（開發測試版）',
    body: 'FinMate 目前為課程專題與開發測試版本。功能與資料格式仍可能調整，請勿將本服務作為唯一的財務紀錄或專業理財依據。'
  },
  privacy: {
    title: '隱私權政策（開發測試版）',
    body: 'FinMate 只會為提供記帳功能保存必要的帳務與設定資料。本測試版不會要求你提供密碼，也不會在前端保存 Supabase 的秘密金鑰。'
  }
};

function LegalDialog({ type, onClose }) {
  if (!type) return null;
  const copy = LEGAL_COPY[type];
  return (
    <div className="login-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-dialog-title">
        <div className="login-dialog__icon" aria-hidden="true"><ShieldCheck size={22} /></div>
        <h2 id="login-dialog-title">{copy.title}</h2>
        <p>{copy.body}</p>
        <button type="button" onClick={onClose} autoFocus>我知道了</button>
      </section>
    </div>
  );
}

export default function LoginPage({ status, message, onContinueAsGuest }) {
  const [dialog, setDialog] = useState(null);
  const busy = status === 'signing-in';

  return (
    <main className="login-page">
      <div className="login-layout">
        <section className="login-visual" aria-label="FinMate 功能介紹">
          <div className="login-brand"><span aria-hidden="true">◒</span>{LOGIN_CONTENT.brand}</div>
          <div className="login-feature login-feature--reminder">
            <span>{LOGIN_CONTENT.features[1].label}</span>
            <strong>{LOGIN_CONTENT.features[1].value}</strong>
          </div>
          <FinMascot name="Fin" />
          <div className="login-feature login-feature--budget">
            <span>{LOGIN_CONTENT.features[0].label}</span>
            <strong>{LOGIN_CONTENT.features[0].value}</strong>
          </div>
        </section>

        <section className="login-welcome">
          <h1>{LOGIN_CONTENT.title}</h1>
          <p>{LOGIN_CONTENT.description}</p>
        </section>

        <section className="login-actions" aria-label="開始使用 FinMate">
          {message && <p className="login-error" role="alert">{message}</p>}
          <button
            className="login-primary"
            type="button"
            onClick={onContinueAsGuest}
            disabled={busy}
            aria-busy={busy}
          >
            <UserRound size={23} aria-hidden="true" />
            <span>{busy ? '正在建立訪客身分…' : LOGIN_CONTENT.primaryAction}</span>
          </button>
          <button className="login-guest-note" type="button" onClick={() => setDialog('guest')}>
            <Info size={15} aria-hidden="true" />
            <span>{LOGIN_CONTENT.guestNote}</span>
          </button>
          <nav className="login-legal" aria-label="法律資訊">
            <button type="button" onClick={() => setDialog('terms')}>服務條款</button>
            <button type="button" onClick={() => setDialog('privacy')}>隱私權政策</button>
          </nav>
        </section>
      </div>
      <LegalDialog type={dialog} onClose={() => setDialog(null)} />
    </main>
  );
}
