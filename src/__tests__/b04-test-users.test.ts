/**
 * B04 Gate — Jest test: isTestUser
 *
 * Verifies:
 *   1. Phone +573000000002 is a test user (skips OTP in B13)
 *   2. Non-test user phones return false
 *   3. The list format (+57XXXXXXXXXX) works
 */

import { isTestUser } from '../data/auth/test-users';

describe('B04 — isTestUser', () => {
  it('+573000000002 is a test user (skips OTP in B13)', () => {
    expect(isTestUser('+573000000002')).toBe(true);
  });

  it('+573000000000 is a test user', () => {
    expect(isTestUser('+573000000000')).toBe(true);
  });

  it('+573000000001 is a test user', () => {
    expect(isTestUser('+573000000001')).toBe(true);
  });

  it('+570000000000 is a test user', () => {
    expect(isTestUser('+570000000000')).toBe(true);
  });

  it('a random production phone is NOT a test user', () => {
    expect(isTestUser('+573001234567')).toBe(false);
  });

  it('empty string is NOT a test user', () => {
    expect(isTestUser('')).toBe(false);
  });

  it('partial match does not count', () => {
    expect(isTestUser('3000000002')).toBe(false); // no country code
    expect(isTestUser('+57300000000')).toBe(false); // wrong number
  });
});
