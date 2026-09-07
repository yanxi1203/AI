import { createClient } from '@supabase/supabase-js';

const frontendUrl = process.env.FINANCE_FRONTEND_URL || 'http://127.0.0.1:5173';
const apiUrl = process.env.FINANCE_API_URL || 'http://127.0.0.1:8787';
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error('smoke 需要 SUPABASE_URL 與 SUPABASE_PUBLISHABLE_KEY');
}

const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const { data, error } = await supabase.auth.signInAnonymously();
if (error || !data.session) throw error || new Error('無法建立 smoke 訪客');
const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${data.session.access_token}`
};

const expectOk = async (response, label) => {
  if (response.ok) return response;
  const body = await response.text().catch(() => '');
  throw new Error(`${label}失敗（${response.status}）${body ? `：${body}` : ''}`);
};

try {
  const health = await expectOk(await fetch(`${apiUrl}/api/health`), '後端健康檢查');
  const frontend = await expectOk(await fetch(`${frontendUrl}/`), '前端首頁');
  await expectOk(await fetch(`${apiUrl}/api/state`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      expectedRevision: 0,
      state: {
        monthlyBudget: 5000,
        settings: { name: '測試管家' },
        transactions: [],
        goals: [],
        recurring: [],
        onboardingCompleted: true
      }
    })
  }), '狀態保存');

  const assistantResponse = await expectOk(await fetch(`${apiUrl}/api/assistant/message`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text: '午餐 110 元' })
  }), '管家記帳');
  const assistant = await assistantResponse.json();
  const loadedResponse = await expectOk(await fetch(`${apiUrl}/api/state`, { headers }), '狀態讀取');
  const loaded = await loadedResponse.json();
  const transaction = loaded.state?.transactions?.[0];

  if (assistant.result?.kind !== 'transaction_added') throw new Error('管家沒有建立預期的支出紀錄');
  if (transaction?.amount !== 110 || transaction?.title !== '午餐') throw new Error('後端沒有保存正確的午餐紀錄');

  console.log(`整合冒煙測試通過：前端 ${frontend.status}、後端 ${health.status}、午餐 $${transaction.amount} 已保存。`);
} finally {
  await fetch(`${apiUrl}/api/state`, { method: 'DELETE', headers }).catch(() => {});
}
