import test from 'node:test';
import assert from 'node:assert/strict';
import { readServerConfig } from './config.js';

test('server requires only the public Supabase key for normal user routes', () => {
  assert.deepEqual(readServerConfig({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    SUPABASE_SECRET_KEY: 'must-not-be-read'
  }), {
    supabaseUrl: 'https://example.supabase.co',
    supabasePublishableKey: 'sb_publishable_test'
  });
  assert.throws(() => readServerConfig({ SUPABASE_URL: 'https://example.supabase.co' }), /PUBLISHABLE/);
});
