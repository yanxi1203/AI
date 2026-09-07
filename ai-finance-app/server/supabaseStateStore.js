import { createRequestScopedSupabaseClient } from './authContext.js';
import { normalizeAppState } from './stateStore.js';

const APP_STATE_TABLE = 'app_states_v2';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class StateConflictError extends Error {
  constructor() {
    super('資料已在其他裝置更新，請重新載入最新資料。');
    this.name = 'StateConflictError';
    this.status = 409;
    this.code = 'state_conflict';
  }
}

const validateContext = (context) => {
  if (!UUID_PATTERN.test(context?.userId || '')) throw new TypeError('使用者識別格式不正確');
  if (!context?.accessToken) throw new TypeError('缺少使用者 access token');
  return context;
};

const throwSupabaseError = (operation, error) => {
  if (!error) return;
  if (error.code === '23505') throw new StateConflictError();
  const wrapped = new Error(`Supabase ${operation}失敗：${error.message || '未知錯誤'}`);
  wrapped.cause = error;
  throw wrapped;
};

export function createSupabaseStateStore({
  url,
  publishableKey,
  clientFactory,
  now = () => new Date().toISOString()
} = {}) {
  const makeClient = clientFactory || (({ accessToken }) =>
    createRequestScopedSupabaseClient({ url, publishableKey, accessToken }));

  const clientFor = (context) => makeClient(validateContext(context));

  return {
    async load(context) {
      const { userId } = validateContext(context);
      const { data, error } = await clientFor(context)
        .from(APP_STATE_TABLE)
        .select('state, revision')
        .eq('user_id', userId)
        .maybeSingle();

      throwSupabaseError('讀取', error);
      if (!data) return { state: null, revision: 0 };
      return {
        state: normalizeAppState(data.state, now),
        revision: Number(data.revision || 0)
      };
    },

    async save(context, value, { expectedRevision } = {}) {
      const { userId } = validateContext(context);
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
        throw new TypeError('expectedRevision 必須是非負整數');
      }
      const updatedAt = now();
      const state = normalizeAppState({ ...value, updatedAt }, now);
      const nextRevision = expectedRevision + 1;
      const row = {
        user_id: userId,
        state,
        schema_version: state.schemaVersion,
        revision: nextRevision,
        updated_at: updatedAt
      };
      const client = clientFor(context);

      if (expectedRevision === 0) {
        const { data, error } = await client
          .from(APP_STATE_TABLE)
          .insert(row)
          .select('state, revision')
          .single();
        throwSupabaseError('保存', error);
        return { state: normalizeAppState(data?.state || state, now), revision: Number(data?.revision || nextRevision) };
      }

      const { data, error } = await client
        .from(APP_STATE_TABLE)
        .update(row)
        .eq('user_id', userId)
        .eq('revision', expectedRevision)
        .select('state, revision')
        .maybeSingle();

      throwSupabaseError('保存', error);
      if (!data) throw new StateConflictError();
      return { state: normalizeAppState(data.state, now), revision: Number(data.revision) };
    },

    async clear(context) {
      const { userId } = validateContext(context);
      const { error } = await clientFor(context)
        .from(APP_STATE_TABLE)
        .delete()
        .eq('user_id', userId);
      throwSupabaseError('清除', error);
    }
  };
}
