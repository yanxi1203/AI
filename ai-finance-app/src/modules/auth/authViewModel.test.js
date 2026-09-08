import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGIN_CONTENT, resolveAuthView } from './authViewModel.js';

test('startup masks app data until auth resolution finishes', () => {
  assert.equal(resolveAuthView('idle'), 'loading');
  assert.equal(resolveAuthView('loading'), 'loading');
  assert.equal(resolveAuthView('signing-in'), 'login');
  assert.equal(resolveAuthView('signing-up'), 'login');
  assert.equal(resolveAuthView('signing-out'), 'loading');
  assert.equal(resolveAuthView('registration-pending'), 'login');
  assert.equal(resolveAuthView('authenticated'), 'app');
  assert.equal(resolveAuthView('unauthenticated'), 'login');
});

test('login content exposes email, registration and guest entry in Traditional Chinese', () => {
  assert.equal(LOGIN_CONTENT.emailLabel, 'Email');
  assert.equal(LOGIN_CONTENT.passwordLabel, '密碼');
  assert.equal(LOGIN_CONTENT.loginAction, '登入 FinMate');
  assert.equal(LOGIN_CONTENT.registerAction, '建立帳號');
  assert.equal(LOGIN_CONTENT.guestAction, '先以訪客身分使用');
  assert.match(LOGIN_CONTENT.guestNote, /此瀏覽器/);
  assert.equal('googleAction' in LOGIN_CONTENT, false);
  assert.equal('appleAction' in LOGIN_CONTENT, false);
});
