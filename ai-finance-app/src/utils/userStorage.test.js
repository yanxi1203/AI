import test from 'node:test';
import assert from 'node:assert/strict';
import { createUserStorage } from './storage.js';

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    key(index) { return [...values.keys()][index] ?? null; },
    get length() { return values.size; },
    keys() { return [...values.keys()]; }
  };
}

test('local finance cache is isolated by authenticated user id', () => {
  const storage = createMemoryStorage();
  const userA = createUserStorage('11111111-1111-4111-8111-111111111111', { storage });
  const userB = createUserStorage('22222222-2222-4222-8222-222222222222', { storage });

  userA.setTransactions([{ id: 'a', amount: 110 }]);
  userA.setBudget(5000);
  userB.setTransactions([{ id: 'b', amount: 70 }]);
  userB.setBudget(9000);

  assert.deepEqual(userA.getTransactions(), [{ id: 'a', amount: 110 }]);
  assert.deepEqual(userB.getTransactions(), [{ id: 'b', amount: 70 }]);
  assert.equal(userA.getBudget(), 5000);
  assert.equal(userB.getBudget(), 9000);
  assert.ok(storage.keys().every((key) => key.startsWith('finmate:user:')));
});

test('clearing one user cache never removes another user cache', () => {
  const storage = createMemoryStorage();
  const userA = createUserStorage('11111111-1111-4111-8111-111111111111', { storage });
  const userB = createUserStorage('22222222-2222-4222-8222-222222222222', { storage });
  userA.setSettings({ name: 'A' });
  userB.setSettings({ name: 'B' });

  userA.clear();

  assert.equal(userA.getSettings().name, 'Fin');
  assert.equal(userB.getSettings().name, 'B');
});
