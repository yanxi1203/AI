import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGIN_CONTENT, resolveAuthView } from './authViewModel.js';

test('startup masks app data until auth resolution finishes', () => {
  assert.equal(resolveAuthView('idle'), 'loading');
  assert.equal(resolveAuthView('loading'), 'loading');
  assert.equal(resolveAuthView('signing-in'), 'loading');
  assert.equal(resolveAuthView('authenticated'), 'app');
  assert.equal(resolveAuthView('unauthenticated'), 'login');
});

test('first release login content exposes only the real guest action', () => {
  assert.equal(LOGIN_CONTENT.primaryAction, '先以訪客身分體驗');
  assert.match(LOGIN_CONTENT.guestNote, /此瀏覽器/);
  assert.equal('googleAction' in LOGIN_CONTENT, false);
  assert.equal('appleAction' in LOGIN_CONTENT, false);
});
