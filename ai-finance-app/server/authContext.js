import { createClient } from '@supabase/supabase-js';

export class AuthenticationError extends Error {
  constructor(message = '登入狀態無效，請重新進入 FinMate') {
    super(message);
    this.name = 'AuthenticationError';
    this.status = 401;
    this.code = 'unauthorized';
  }
}

export function readBearerToken(request) {
  const header = request.headers.authorization;
  if (typeof header !== 'string') throw new AuthenticationError();
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) throw new AuthenticationError();
  return match[1];
}

const baseOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
};

export function createSupabaseAuthVerifier({ url, publishableKey, client } = {}) {
  if (!client && (!url || !publishableKey)) {
    throw new TypeError('SUPABASE_URL 與 SUPABASE_PUBLISHABLE_KEY 為必填');
  }
  const verifier = client || createClient(url, publishableKey, baseOptions);

  return async function authenticateRequest(request) {
    const accessToken = readBearerToken(request);
    const { data, error } = await verifier.auth.getUser(accessToken);
    if (error || !data?.user?.id) throw new AuthenticationError();
    return { userId: data.user.id, accessToken };
  };
}

export function createRequestScopedSupabaseClient({ url, publishableKey, accessToken }) {
  if (!url || !publishableKey || !accessToken) {
    throw new TypeError('建立使用者資料 client 時缺少必要設定');
  }
  return createClient(url, publishableKey, {
    ...baseOptions,
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
}
