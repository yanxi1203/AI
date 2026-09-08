const CONFIGURATION_MESSAGE = '目前無法啟動登入服務，請檢查開發環境設定。';
const OFFLINE_MESSAGE = '目前沒有網路連線，請確認連線後再試一次。';
const GUEST_ERROR_MESSAGE = '建立訪客身分失敗，請稍後再試。';
const SESSION_ERROR_MESSAGE = '目前無法確認登入狀態，請稍後再試。';
const LOGIN_ERROR_MESSAGE = '登入失敗，請稍後再試。';
const INVALID_CREDENTIALS_MESSAGE = '帳號或密碼不正確，請重新確認。';
const EMAIL_NOT_CONFIRMED_MESSAGE = '請先到信箱完成 Email 驗證，再回來登入。';
const REGISTRATION_ERROR_MESSAGE = '建立帳號失敗，請稍後再試。';
const REGISTRATION_PENDING_MESSAGE = '帳號已建立，請到信箱完成驗證後再回來登入。';
const SIGN_OUT_ERROR_MESSAGE = '登出失敗，請稍後再試。';

const authenticatedState = (session) => ({
  status: 'authenticated',
  session,
  message: ''
});

export function createAuthController({
  authClient,
  online = () => globalThis.navigator?.onLine !== false,
  logger = console
} = {}) {
  let state = { status: 'loading', session: null, message: '' };
  let subscription = null;
  let startPromise = null;
  let guestPromise = null;
  let credentialPromise = null;
  let signOutPromise = null;
  let generation = 0;
  const listeners = new Set();

  const publish = (nextState) => {
    state = nextState;
    listeners.forEach((listener) => listener());
  };

  const applySession = (session) => {
    publish(session
      ? authenticatedState(session)
      : { status: 'unauthenticated', session: null, message: '' });
  };

  const start = () => {
    if (startPromise) return startPromise;
    const activeGeneration = ++generation;

    startPromise = (async () => {
      if (!authClient?.auth) {
        publish({ status: 'configuration-error', session: null, message: CONFIGURATION_MESSAGE });
        return state;
      }

      publish({ status: 'loading', session: null, message: '' });
      let authEventReceived = false;
      const listenerResult = authClient.auth.onAuthStateChange((_event, session) => {
        if (generation !== activeGeneration) return;
        authEventReceived = true;
        applySession(session);
      });
      subscription = listenerResult?.data?.subscription || null;

      try {
        const { data, error } = await authClient.auth.getSession();
        if (generation !== activeGeneration) return state;
        if (error) throw error;
        if (!authEventReceived) applySession(data?.session || null);
      } catch (error) {
        if (generation !== activeGeneration) return state;
        logger.error?.(error);
        publish({ status: 'error', session: null, message: SESSION_ERROR_MESSAGE });
      }
      return state;
    })();

    return startPromise;
  };

  const stop = () => {
    generation += 1;
    subscription?.unsubscribe?.();
    subscription = null;
    startPromise = null;
  };

  const signInAsGuest = () => {
    if (guestPromise) return guestPromise;

    guestPromise = (async () => {
      if (!authClient?.auth) {
        const error = new Error(CONFIGURATION_MESSAGE);
        publish({ status: 'configuration-error', session: null, message: error.message });
        throw error;
      }
      if (!online()) {
        const error = new Error(OFFLINE_MESSAGE);
        publish({ status: 'error', session: null, message: error.message });
        throw error;
      }

      publish({ status: 'signing-in', session: null, message: '' });
      try {
        const { data, error } = await authClient.auth.signInAnonymously();
        if (error || !data?.session) throw error || new Error('missing session');
        publish(authenticatedState(data.session));
        return data.session;
      } catch (error) {
        logger.error?.(error);
        const friendly = new Error(GUEST_ERROR_MESSAGE);
        publish({ status: 'error', session: null, message: friendly.message });
        throw friendly;
      } finally {
        guestPromise = null;
      }
    })();

    return guestPromise;
  };

  const ensureAuthAvailable = () => {
    if (!authClient?.auth) {
      const error = new Error(CONFIGURATION_MESSAGE);
      publish({ status: 'configuration-error', session: null, message: error.message });
      throw error;
    }
    if (!online()) {
      const error = new Error(OFFLINE_MESSAGE);
      publish({ status: 'error', session: null, message: error.message });
      throw error;
    }
  };

  const signInWithPassword = (email, password) => {
    if (credentialPromise) return credentialPromise;
    credentialPromise = (async () => {
      ensureAuthAvailable();
      publish({ status: 'signing-in', session: null, message: '' });
      try {
        const { data, error } = await authClient.auth.signInWithPassword({ email: email.trim(), password });
        if (error || !data?.session) throw error || new Error('missing session');
        publish(authenticatedState(data.session));
        return data.session;
      } catch (error) {
        logger.error?.(error);
        const detail = String(error?.message || '');
        const message = /invalid login credentials/i.test(detail)
          ? INVALID_CREDENTIALS_MESSAGE
          : /email not confirmed/i.test(detail)
            ? EMAIL_NOT_CONFIRMED_MESSAGE
            : LOGIN_ERROR_MESSAGE;
        publish({ status: 'error', session: null, message });
        throw new Error(message);
      } finally {
        credentialPromise = null;
      }
    })();
    return credentialPromise;
  };

  const signUpWithPassword = (email, password) => {
    if (credentialPromise) return credentialPromise;
    credentialPromise = (async () => {
      ensureAuthAvailable();
      publish({ status: 'signing-up', session: null, message: '' });
      try {
        const { data, error } = await authClient.auth.signUp({ email: email.trim(), password });
        if (error || !data?.user) throw error || new Error('missing user');
        if (data.session) {
          publish(authenticatedState(data.session));
          return { session: data.session, requiresEmailConfirmation: false };
        }
        publish({ status: 'registration-pending', session: null, message: REGISTRATION_PENDING_MESSAGE });
        return { session: null, requiresEmailConfirmation: true };
      } catch (error) {
        logger.error?.(error);
        const detail = String(error?.message || '');
        const message = /already registered|already exists/i.test(detail)
          ? '這個 Email 已經註冊，請直接登入。'
          : /password/i.test(detail)
            ? '密碼至少需要 6 個字元。'
            : REGISTRATION_ERROR_MESSAGE;
        publish({ status: 'error', session: null, message });
        throw new Error(message);
      } finally {
        credentialPromise = null;
      }
    })();
    return credentialPromise;
  };

  const signOut = () => {
    if (signOutPromise) return signOutPromise;
    const currentSession = state.session;
    signOutPromise = (async () => {
      if (!authClient?.auth) throw new Error(CONFIGURATION_MESSAGE);
      publish({ status: 'signing-out', session: currentSession, message: '' });
      try {
        const { error } = await authClient.auth.signOut();
        if (error) throw error;
        publish({ status: 'unauthenticated', session: null, message: '' });
      } catch (error) {
        logger.error?.(error);
        publish({ status: 'authenticated', session: currentSession, message: SIGN_OUT_ERROR_MESSAGE });
        throw new Error(SIGN_OUT_ERROR_MESSAGE);
      } finally {
        signOutPromise = null;
      }
    })();
    return signOutPromise;
  };

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    stop,
    signInAsGuest,
    signInWithPassword,
    signUpWithPassword,
    signOut
  };
}

export const AUTH_MESSAGES = {
  configuration: CONFIGURATION_MESSAGE,
  offline: OFFLINE_MESSAGE,
  guestError: GUEST_ERROR_MESSAGE,
  sessionError: SESSION_ERROR_MESSAGE,
  loginError: LOGIN_ERROR_MESSAGE,
  invalidCredentials: INVALID_CREDENTIALS_MESSAGE,
  emailNotConfirmed: EMAIL_NOT_CONFIRMED_MESSAGE,
  registrationError: REGISTRATION_ERROR_MESSAGE,
  registrationPending: REGISTRATION_PENDING_MESSAGE,
  signOutError: SIGN_OUT_ERROR_MESSAGE
};
