import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, readSession } from '../lib/auth.js';

test('a rotated signing key preserves existing sessions only while configured', () => {
  const original = {
    current: process.env.AUTH_SESSION_SECRET,
    previous: process.env.AUTH_SESSION_SECRET_PREVIOUS,
  };
  try {
    process.env.AUTH_SESSION_SECRET = 'stellar-old-secret-for-regression-test';
    delete process.env.AUTH_SESSION_SECRET_PREVIOUS;
    const oldToken = createSession('USER@example.test');
    process.env.AUTH_SESSION_SECRET = 'stellar-new-secret-for-regression-test';
    assert.equal(readSession({ headers: { authorization: 'Bearer ' + oldToken } }), null);

    process.env.AUTH_SESSION_SECRET_PREVIOUS = 'stellar-old-secret-for-regression-test';
    assert.deepEqual(readSession({ headers: { authorization: 'Bearer ' + oldToken } }), { email: 'user@example.test' });
    const newToken = createSession('USER@example.test');
    assert.notEqual(newToken, oldToken);
    assert.deepEqual(readSession({ headers: { authorization: 'Bearer ' + newToken } }), { email: 'user@example.test' });
    assert.equal(readSession({ headers: { authorization: 'Bearer ' + oldToken + 'tampered' } }), null);
    delete process.env.AUTH_SESSION_SECRET_PREVIOUS;
    assert.equal(readSession({ headers: { authorization: 'Bearer ' + oldToken } }), null);
    assert.ok(readSession({ headers: { authorization: 'Bearer ' + newToken } }));
  } finally {
    if (original.current === undefined) delete process.env.AUTH_SESSION_SECRET;
    else process.env.AUTH_SESSION_SECRET = original.current;
    if (original.previous === undefined) delete process.env.AUTH_SESSION_SECRET_PREVIOUS;
    else process.env.AUTH_SESSION_SECRET_PREVIOUS = original.previous;
  }
});
