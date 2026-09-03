import { createClient } from '@supabase/supabase-js';
import { normalizeAppState, validateUserId } from './stateStore.js';

const APP_STATE_TABLE = 'app_states';

const throwSupabaseError = (operation, error) => {
  if (!error) return;
  const wrapped = new Error(`Supabase ${operation}失敗：${error.message || '未知錯誤'}`);
  wrapped.cause = error;
  throw wrapped;
};

const createServerClient = ({ url, secretKey }) => {
  if (!url) throw new TypeError('SUPABASE_URL 為必填');
  if (!secretKey) throw new TypeError('SUPABASE_SECRET_KEY 為必填');

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
};

export function createSupabaseStateStore({ url, secretKey, client, now = () => new Date().toISOString() } = {}) {
  const supabase = client || createServerClient({ url, secretKey });

  return {
    async load(userId) {
      const validUserId = validateUserId(userId);
      const { data, error } = await supabase
        .from(APP_STATE_TABLE)
        .select('state')
        .eq('device_id', validUserId)
        .maybeSingle();

      throwSupabaseError('讀取', error);
      return data?.state == null ? null : normalizeAppState(data.state, now);
    },

    async save(userId, value) {
      const validUserId = validateUserId(userId);
      const state = normalizeAppState({ ...value, updatedAt: now() }, now);
      const { data, error } = await supabase
        .from(APP_STATE_TABLE)
        .upsert({
          device_id: validUserId,
          state,
          schema_version: state.schemaVersion,
          updated_at: state.updatedAt
        }, { onConflict: 'device_id' })
        .select('state')
        .single();

      throwSupabaseError('保存', error);
      return normalizeAppState(data?.state || state, now);
    },

    async clear(userId) {
      const validUserId = validateUserId(userId);
      const { error } = await supabase
        .from(APP_STATE_TABLE)
        .delete()
        .eq('device_id', validUserId);

      throwSupabaseError('清除', error);
    }
  };
}

export function createMigratingStateStore({ primaryStore, legacyStore }) {
  if (!primaryStore || !legacyStore) throw new TypeError('primaryStore 與 legacyStore 為必填');

  return {
    async load(userId, options) {
      const cloudState = await primaryStore.load(userId, options);
      if (cloudState) return cloudState;

      const localState = await legacyStore.load(userId, options);
      if (!localState) return null;

      const migrated = await primaryStore.save(userId, localState);
      await legacyStore.clear(userId);
      return migrated;
    },

    async save(userId, value) {
      return primaryStore.save(userId, value);
    },

    async clear(userId) {
      await primaryStore.clear(userId);
      await legacyStore.clear(userId);
    }
  };
}
