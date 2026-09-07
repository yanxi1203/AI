import { createClient } from '@supabase/supabase-js';

export function readSupabaseBrowserConfig(env = import.meta.env) {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    return {
      ok: false,
      message: '缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_PUBLISHABLE_KEY'
    };
  }
  return { ok: true, url, publishableKey };
}

export function createSupabaseBrowserClient(config = readSupabaseBrowserConfig()) {
  if (!config.ok) return null;
  return createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export const supabaseBrowserConfig = readSupabaseBrowserConfig();
export const supabaseBrowserClient = createSupabaseBrowserClient(supabaseBrowserConfig);
