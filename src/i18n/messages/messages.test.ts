import { describe, expect, it } from 'vitest';

import en from './en.json';
import pl from './pl.json';

// Component tests mock `t` to echo the key, so they can't notice a key missing from its namespace.
const REQUIRED_KEYS = [
  'auth.forgotPassword.expiredAlert',
  'auth.errors.serviceUnavailable',
  'auth.errors.generic',
  'auth.verifyEmail.unavailableHeading',
  'auth.verifyEmail.unavailableBody',
];

function lookup(messages: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], messages);
}

describe.each([
  ['en', en],
  ['pl', pl],
])('%s messages', (_locale, messages) => {
  it.each(REQUIRED_KEYS)('defines %s', (key) => {
    expect(lookup(messages, key)).toEqual(expect.any(String));
  });
});
