import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAdminKey } from './seed-config.mjs';

const jwt = (role) =>
  `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;

test('seed accepts server keys and strips surrounding whitespace', () => {
  assert.equal(validateAdminKey(' sb_secret_test-only '), 'sb_secret_test-only');
  assert.equal(validateAdminKey(jwt('service_role')), jwt('service_role'));
});

test('seed rejects public, user and malformed keys without leaking them', () => {
  for (const key of [
    'sb_publishable_test-only',
    jwt('anon'),
    jwt('authenticated'),
    'malformed-key',
    '',
    undefined,
  ]) {
    assert.throws(
      () => validateAdminKey(key),
      (error) => {
        assert.match(error.message, /SUPABASE_SERVICE_ROLE_KEY/);
        assert.match(error.message, /Publishable\/anon key/);
        if (key) assert.ok(!error.message.includes(key));
        return true;
      },
    );
  }
});
