import { createAppServer } from './appServer.js';
import { createSupabaseAuthVerifier } from './authContext.js';
import { readServerConfig } from './config.js';
import { createSupabaseStateStore } from './supabaseStateStore.js';
import { processFinanceMessage } from '../src/modules/transactions/transactionAssistant.js';
import { estimateGoal } from './services/goalEstimator.js';

const port = Number(process.env.FINANCE_API_PORT || 8787);
const host = '127.0.0.1';
const { supabaseUrl, supabasePublishableKey } = readServerConfig();

const store = createSupabaseStateStore({
  url: supabaseUrl,
  publishableKey: supabasePublishableKey
});
const authenticateRequest = createSupabaseAuthVerifier({
  url: supabaseUrl,
  publishableKey: supabasePublishableKey
});

const server = createAppServer({
  store,
  authenticateRequest,
  financeMessageProcessor: processFinanceMessage,
  goalEstimator: estimateGoal
});

server.listen(port, host, () => {
  console.log(`AI 財務管家後端已啟動：http://${host}:${port}`);
  console.log('資料儲存：Supabase app_states_v2（RLS 使用者隔離）');
});

const close = () => server.close(() => process.exit(0));
process.on('SIGINT', close);
process.on('SIGTERM', close);
