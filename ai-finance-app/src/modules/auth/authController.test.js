import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthController } from './authController.js';

const deferred = () => {
  let resolve;
  const promise = new Promise((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
};

function createAuthClient({ initialSession = null, signInAnonymously } = {}) {
  let listener;
  let unsubscribeCount = 0;
  let anonymousCalls = 0;
  return {
    auth: {
      async getSession() {
        return { data: { session: initialSession }, error: null };
      },
      onAuthStateChange(callback) {
        listener = callback;
        return { data: { subscription: { unsubscribe() { unsubscribeCount += 1; } } } };
      },
      async signInAnonymously() {
        anonymousCalls += 1;
        if (signInAnonymously) return signInAnonymously();
        return { data: { session: { user: { id: 'guest-a', is_anonymous: true }, access_token: 'guest-token' } }, error: null };
      }
    },
    emit(event, session) { listener?.(event, session); },
    get anonymousCalls() { return anonymousCalls; },
    get unsubscribeCount() { return unsubscribeCount; }
  };
}

test('auth controller resolves an existing session before declaring the app ready', async () => {
  const session = { user: { id: 'user-a' }, access_token: 'token-a' };
  const client = createAuthClient({ initialSession: session });
  const controller = createAuthController({ authClient: client, online: () => true });

  assert.equal(controller.getSnapshot().status, 'loading');
  await controller.start();
  assert.equal(controller.getSnapshot().status, 'authenticated');
  assert.equal(controller.getSnapshot().session.user.id, 'user-a');

  controller.stop();
  assert.equal(client.unsubscribeCount, 1);
});

test('auth controller exposes the login screen only after confirming there is no session', async () => {
  const controller = createAuthController({ authClient: createAuthClient(), online: () => true });
  await controller.start();
  assert.equal(controller.getSnapshot().status, 'unauthenticated');
  controller.stop();
});

test('repeated guest clicks share one anonymous sign-in request', async () => {
  const pending = deferred();
  const client = createAuthClient({ signInAnonymously: () => pending.promise });
  const controller = createAuthController({ authClient: client, online: () => true });
  await controller.start();

  const first = controller.signInAsGuest();
  const second = controller.signInAsGuest();
  assert.equal(client.anonymousCalls, 1);
  assert.equal(controller.getSnapshot().status, 'signing-in');

  pending.resolve({ data: { session: { user: { id: 'guest-a', is_anonymous: true }, access_token: 'guest-token' } }, error: null });
  assert.equal((await first).user.id, 'guest-a');
  assert.equal((await second).user.id, 'guest-a');
  assert.equal(controller.getSnapshot().status, 'authenticated');
  controller.stop();
});

test('guest sign-in reports offline and missing configuration in Traditional Chinese', async () => {
  const offline = createAuthController({ authClient: createAuthClient(), online: () => false });
  await offline.start();
  await assert.rejects(() => offline.signInAsGuest(), /目前沒有網路連線/);
  assert.match(offline.getSnapshot().message, /目前沒有網路連線/);

  const missing = createAuthController({ authClient: null, online: () => true });
  await missing.start();
  assert.equal(missing.getSnapshot().status, 'configuration-error');
  assert.match(missing.getSnapshot().message, /開發環境設定/);
});


test('guest sign-in failure stays on the login screen with a retryable message', async () => {
  const client = createAuthClient({
    signInAnonymously: async () => ({ data: { session: null }, error: new Error('provider unavailable') })
  });
  const controller = createAuthController({
    authClient: client,
    online: () => true,
    logger: { error() {} }
  });
  await controller.start();
  await assert.rejects(() => controller.signInAsGuest(), /建立訪客身分失敗/);
  assert.equal(controller.getSnapshot().status, 'error');
  assert.match(controller.getSnapshot().message, /稍後再試/);
});
