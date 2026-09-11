import { ChevronRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import FinMascot from '../shared/FinMascot.jsx';
import { LOGIN_CONTENT } from '../modules/auth/authViewModel.js';

const LEGAL_COPY = {
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
  const [showPassword, setShowPassword] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const busy = status === 'signing-in' || status === 'signing-up';
  const registering = mode === 'register';

  const changeMode = (nextMode) => {
    setMode(nextMode);
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
          <div className="login-brand"><span className="login-brand-mark" aria-hidden="true"><i /></span>{LOGIN_CONTENT.brand}</div>
          <div className="login-feature login-feature--reminder">
            <span>{LOGIN_CONTENT.features[1].label}</span>
            <strong>{LOGIN_CONTENT.features[1].value}</strong>
          </div>
          <FinMascot name="Fin" />
          <div className="login-feature login-feature--budget">
            <span>{LOGIN_CONTENT.features[0].label}</span>
            <strong>{LOGIN_CONTENT.features[0].value}</strong>
          </div>
          <i className="login-decor login-decor--leaf-one" aria-hidden="true" />
          <i className="login-decor login-decor--leaf-two" aria-hidden="true" />
          <i className="login-decor login-decor--spark-one" aria-hidden="true" />
          <i className="login-decor login-decor--spark-two" aria-hidden="true" />
        </section>

        <section className="login-welcome">
          <h1>{LOGIN_CONTENT.title}</h1>
          <p>我會陪你記下花費，<br />也幫你慢慢整理未來。</p>
        </section>

        <section className="login-actions" aria-label="登入、建立帳號或訪客體驗">
          <div className="login-auth-card">
            <div className="login-tabs" role="tablist" aria-label="帳號操作">
              <button type="button" role="tab" aria-selected={!registering} className={!registering ? 'is-active' : ''} onClick={() => changeMode('login')} disabled={busy}>登入</button>
              <button type="button" role="tab" aria-selected={registering} className={registering ? 'is-active' : ''} onClick={() => changeMode('register')} disabled={busy}>建立帳號</button>
            </div>

            <form className="login-form" onSubmit={submitCredentials}>
              <label className="login-field">
                <span>Email</span>
                <div className="login-input">
                  <Mail size={19} aria-hidden="true" />
                  <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" disabled={busy} required />
                </div>
              </label>
              <label className="login-field">
                <span>密碼</span>
                <div className="login-input">
                  <LockKeyhole size={19} aria-hidden="true" />
                  <input type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={registering ? '至少 6 個字元' : '輸入密碼'} minLength={6} disabled={busy} required />
                  <button type="button" className="login-password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? '隱藏密碼' : '顯示密碼'} disabled={busy}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button>
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

            <div className="login-divider" aria-hidden="true"><span>或</span></div>
            <div className="login-google-placeholder" aria-disabled="true" aria-label="使用 Google 繼續，即將推出">
              <span className="login-google-mark" aria-hidden="true">G</span>
              <strong>使用 Google 繼續</strong>
              <small>即將推出</small>
            </div>

            <div className="login-divider login-divider--guest" aria-hidden="true"><span>先逛逛？</span></div>
            <button className="login-guest-action" type="button" onClick={continueAsGuest} disabled={busy}>
              <UserRound size={21} aria-hidden="true" />
              <span>{status === 'signing-in' ? '正在建立訪客身分…' : '以訪客身分體驗'}</span>
              <ChevronRight size={19} aria-hidden="true" />
            </button>
            <p className="login-guest-note">{LOGIN_CONTENT.guestNote}</p>
          </div>

          <nav className="login-legal" aria-label="法律資訊">
            <button type="button" onClick={() => setDialog('terms')}>服務條款</button>
            <span aria-hidden="true">｜</span>
            <button type="button" onClick={() => setDialog('privacy')}>隱私權政策</button>
          </nav>
        </section>
      </div>
      <LegalDialog type={dialog} onClose={() => setDialog(null)} />
    </main>
  );
}
