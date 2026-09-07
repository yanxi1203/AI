import FinMascot from '../shared/FinMascot.jsx';

export default function AuthLoadingScreen() {
  return (
    <main className="auth-loading" aria-busy="true" aria-label="正在確認登入狀態">
      <FinMascot compact name="Fin" />
      <strong>FinMate</strong>
      <span>正在準備你的資料…</span>
    </main>
  );
}
