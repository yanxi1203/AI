export const LOGIN_CONTENT = Object.freeze({
  brand: 'FinMate',
  title: '嗨，我是 Fin。',
  description: '我會陪你記下花費，也幫你慢慢整理未來。',
  emailLabel: 'Email',
  passwordLabel: '密碼',
  loginAction: '登入 FinMate',
  registerAction: '建立帳號',
  guestAction: '先以訪客身分使用',
  guestNote: '訪客資料會保留在此瀏覽器，建議日後連結帳號',
  features: [
    { label: '每日可用預算', value: '隨時掌握' },
    { label: '固定支出', value: '到期前提醒' }
  ]
});

export function resolveAuthView(status) {
  if (['idle', 'loading', 'signing-out'].includes(status)) return 'loading';
  if (['signing-in', 'signing-up'].includes(status)) return 'login';
  if (status === 'authenticated') return 'app';
  return 'login';
}
