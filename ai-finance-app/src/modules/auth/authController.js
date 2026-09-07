const CONFIGURATION_MESSAGE = '目前無法啟動登入服務，請檢查開發環境設定。';
const OFFLINE_MESSAGE = '目前沒有網路連線，請確認連線後再試一次。';
const GUEST_ERROR_MESSAGE = '建立訪客身分失敗，請稍後再試。';
const SESSION_ERROR_MESSAGE = '目前無法確認登入狀態，請稍後再試。';

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

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start,
    stop,
    signInAsGuest
  };
}

export const AUTH_MESSAGES = {
  configuration: CONFIGURATION_MESSAGE,
  offline: OFFLINE_MESSAGE,
  guestError: GUEST_ERROR_MESSAGE,
  sessionError: SESSION_ERROR_MESSAGE
};
