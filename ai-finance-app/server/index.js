import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createAppServer } from './appServer.js';
import { createPartitionedFileStateStore } from './stateStore.js';
import { createMigratingStateStore, createSupabaseStateStore } from './supabaseStateStore.js';
import { processFinanceMessage } from '../src/modules/transactions/transactionAssistant.js';
import { estimateGoal } from './services/goalEstimator.js';

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.FINANCE_API_PORT || 8787);
const host = '127.0.0.1';
const localStore = createPartitionedFileStateStore({
  directoryPath: join(serverDirectory, 'data', 'users'),
  legacyFilePath: join(serverDirectory, 'data', 'app-state.json')
});
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

if (Boolean(supabaseUrl) !== Boolean(supabaseSecretKey)) {
  throw new Error('Supabase 設定不完整：SUPABASE_URL 與 SUPABASE_SECRET_KEY 必須一起提供');
}

const usesSupabase = Boolean(supabaseUrl && supabaseSecretKey);
const store = usesSupabase
  ? createMigratingStateStore({
      primaryStore: createSupabaseStateStore({ url: supabaseUrl, secretKey: supabaseSecretKey }),
      legacyStore: localStore
    })
  : localStore;

const server = createAppServer({
  store,
  financeMessageProcessor: processFinanceMessage,
  goalEstimator: estimateGoal
});
server.listen(port, host, () => {
  console.log(`AI 財務管家後端已啟動：http://${host}:${port}`);
  console.log(`資料儲存：${usesSupabase ? 'Supabase 雲端資料庫' : '本機 JSON（尚未設定 Supabase）'}`);
});

const close = () => server.close(() => process.exit(0));
process.on('SIGINT', close);
process.on('SIGTERM', close);
