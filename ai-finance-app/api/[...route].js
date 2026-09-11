import { createAppHandler } from '../server/appServer.js';
import { createSupabaseAuthVerifier } from '../server/authContext.js';
import { readServerConfig } from '../server/config.js';
import { createSupabaseStateStore } from '../server/supabaseStateStore.js';
import { processFinanceMessage } from '../src/modules/transactions/transactionAssistant.js';
import { estimateGoal } from '../server/services/goalEstimator.js';

let appHandler = null;

export function getAppHandler(env = process.env) {
  if (!appHandler) {
    const { supabaseUrl, supabasePublishableKey } = readServerConfig(env);
    const store = createSupabaseStateStore({
      url: supabaseUrl,
      publishableKey: supabasePublishableKey
    });
    const authenticateRequest = createSupabaseAuthVerifier({
      url: supabaseUrl,
      publishableKey: supabasePublishableKey
    });
    appHandler = createAppHandler({
      store,
      authenticateRequest,
      financeMessageProcessor: processFinanceMessage,
      goalEstimator: estimateGoal
    });
  }
  return appHandler;
}

export default async function handler(req, res) {
  const handle = getAppHandler();
  return handle(req, res);
}
