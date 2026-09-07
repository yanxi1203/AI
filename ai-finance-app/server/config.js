export function readServerConfig(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL?.trim();
  const supabasePublishableKey = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error('後端設定不完整：請設定 SUPABASE_URL 與 SUPABASE_PUBLISHABLE_KEY');
  }
  return { supabaseUrl, supabasePublishableKey };
}
