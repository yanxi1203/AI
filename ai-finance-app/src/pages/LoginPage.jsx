import { Info, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
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
    body: 'FinMate 只會保存提供記帳與帳號功能所需的資料。Email 與密碼驗證由 Supabase Auth 處理，FinMate 不會把你的原始密碼儲存在前端，也不會把秘密金鑰放進瀏覽器。'
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

export default function LoginPage({ status, message, onSignIn, onSignUp, onContinueAsGuest }) {
  const [dialog, setDialog] = useState(null);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const busy = status === 'signing-in' || status === 'signing-up';
  const registering = mode === 'register';

  const changeMode = () => {
    setMode(registering ? 'login' : 'register');
    setFormMessage('');
  };

  const submitCredentials = async (event) => {
    event.preventDefault();
    setFormMessage('');
    if (!email.trim()) {
      setFormMessage('請輸入 Email。');
      return;
    }
    if (password.length < 6) {
      setFormMessage('密碼至少需要 6 個字元。');
      return;
    }
    try {
      if (registering) {
        const result = await onSignUp(email, password);
        if (result?.requiresEmailConfirmation) {
          setMode('login');
          setPassword('');
        }
      } else {
        await onSignIn(email, password);
      }
    } catch {
      // Auth controller publishes the user-facing error message.
    }
  };

  const continueAsGuest = async () => {
    setFormMessage('');
    try {
      await onContinueAsGuest();
    } catch {
      // Auth controller publishes the user-facing error message.
    }
  };

  const visibleMessage = formMessage || message;

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

        <section className="login-actions" aria-label="登入或開始使用 FinMate">
          <div className="login-mode-copy">
            <strong>{registering ? '建立你的 FinMate 帳號' : '歡迎回來'}</strong>
            <span>{registering ? '註冊後就能保留自己的帳本' : '登入後繼續整理你的日常財務'}</span>
          </div>

          <form className="login-form" onSubmit={submitCredentials}>
            <label>
              <span>{LOGIN_CONTENT.emailLabel}</span>
              <div className="login-input">
                <Mail size={18} aria-hidden="true" />
                <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" disabled={busy} required />
              </div>
            </label>
            <label>
              <span>{LOGIN_CONTENT.passwordLabel}</span>
              <div className="login-input">
                <LockKeyhole size={18} aria-hidden="true" />
                <input type="password" autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={registering ? '至少 6 個字元' : '輸入密碼'} minLength={6} disabled={busy} required />
              </div>
            </label>

            {visibleMessage && (
              <p className={status === 'registration-pending' && !formMessage ? 'login-notice' : 'login-error'} role={status === 'registration-pending' && !formMessage ? 'status' : 'alert'}>
                {visibleMessage}
              </p>
            )}

            <button className="login-primary" type="submit" disabled={busy} aria-busy={busy}>
              <span>{busy ? (registering ? '正在建立帳號…' : '正在登入…') : (registering ? LOGIN_CONTENT.registerAction : LOGIN_CONTENT.loginAction)}</span>
            </button>
          </form>

          <button className="login-switch" type="button" onClick={changeMode} disabled={busy}>
            {registering ? '已經有帳號？回到登入' : '第一次使用？建立帳號'}
          </button>

          <div className="login-divider" aria-hidden="true"><span>或</span></div>

          <button className="login-guest-action" type="button" onClick={continueAsGuest} disabled={busy}>
            <UserRound size={21} aria-hidden="true" />
            <span>{status === 'signing-in' ? '正在建立訪客身分…' : LOGIN_CONTENT.guestAction}</span>
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
