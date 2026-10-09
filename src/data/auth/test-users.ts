/**
 * B04 — Test users
 * Ported from: src/app/core/services/auth/test-users.service.ts
 * Classification: Minor adaptation
 * Changes:
 *   - Removed @Injectable({ providedIn: 'root' }) — exported plain function
 *   - Exported as `isTestUser` function (plan.md B04: "export const isTestUser")
 *
 * PRESERVED: list of test user phone numbers exactly as in original.
 * phone 3000000002 (+573000000002) skips OTP flow in B13.
 */

/**
 * List of test user phone numbers.
 * These users bypass OTP/MFA verification in the auth flow.
 */
const testUsers: string[] = [
  '+570000000000',
  '+573000000000',
  '+573000000001',
  '+573000000002',
  '+573000000003',
  '+573007586230',

  // ...add more test users as needed
];

/**
 * Checks if the given phone number is in the list of test users.
 * Test users bypass OTP/MFA (signIn directly → home).
 * @param {string} phoneNumber - The phone number to check.
 * @returns {boolean} True if the phone number is a test user, false otherwise.
 */
export const isTestUser = (phoneNumber: string): boolean => {
  return testUsers.includes(phoneNumber);
};
