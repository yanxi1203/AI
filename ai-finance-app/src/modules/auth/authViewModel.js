export const LOGIN_CONTENT = Object.freeze({
  brand: 'FinMate',
  title: '嗨，我是 Fin。',
  description: '我會陪你記下花費，也幫你慢慢整理未來。',
  primaryAction: '先以訪客身分體驗',
  guestNote: '訪客資料會保留在此瀏覽器，建議日後連結帳號',
  features: [
    { label: '每日可用預算', value: '隨時掌握' },
    { label: '固定支出', value: '到期前提醒' }
  ]
});

export function resolveAuthView(status) {
  if (['idle', 'loading', 'signing-in'].includes(status)) return 'loading';
  if (status === 'authenticated') return 'app';
  return 'login';
}
