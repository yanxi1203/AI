import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthenticationError, createSupabaseAuthVerifier, readBearerToken } from './authContext.js';

test('bearer token is required and malformed credentials are rejected', () => {
  assert.throws(() => readBearerToken({ headers: {} }), AuthenticationError);
  assert.throws(() => readBearerToken({ headers: { authorization: 'Basic x' } }), AuthenticationError);
  assert.equal(readBearerToken({ headers: { authorization: 'Bearer valid.jwt' } }), 'valid.jwt');
});

test('verified Supabase identity is the only source of user ownership', async () => {
  const seen = [];
  const authenticate = createSupabaseAuthVerifier({
    client: {
      auth: {
        async getUser(token) {
          seen.push(token);
          return token === 'token-a'
            ? { data: { user: { id: '11111111-1111-4111-8111-111111111111' } }, error: null }
            : { data: { user: null }, error: new Error('bad jwt') };
        }
      }
    }
  });

  assert.deepEqual(await authenticate({ headers: { authorization: 'Bearer token-a' } }), {
    userId: '11111111-1111-4111-8111-111111111111',
    accessToken: 'token-a'
  });
  await assert.rejects(
    () => authenticate({ headers: { authorization: 'Bearer forged' } }),
    (error) => error.status === 401
  );
  assert.deepEqual(seen, ['token-a', 'forged']);
});
