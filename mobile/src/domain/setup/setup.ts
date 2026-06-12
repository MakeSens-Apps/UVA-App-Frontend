/**
 * B07 — SetupService (domain/setup)
 * Ported from: src/app/core/services/view/setup/setup.service.ts
 * Classification: Minor adaptation
 *
 * Changes from original (portability-matrix §4.1):
 *   - Removed @Injectable({ providedIn: 'root' }) → exported class with static-like methods
 *   - DI constructor parameters → direct singleton imports
 *   - AuthService → authService singleton from @/data/auth/auth
 *   - SessionService → sessionService singleton from @/data/session/session
 *   - UserAPIService → userAPIService singleton from @/data/api/user-api
 *   - UserProgressAPIService → userProgressAPIService singleton from @/data/api/user-progress-api
 *   - All method signatures preserved exactly
 *   - No Angular / React / UI imports
 *
 * Plan B07: "setup.service + setup-racimo.service como módulos
 *            (id secuencial UVA_<code>_<NNNNN> con test)"
 */

import { authService } from '@/data/auth/auth';
import SessionService from '@/data/session/session';
import { userAPIService } from '@/data/api/user-api';
import { userProgressAPIService } from '@/data/api/user-progress-api';
import type { AuthResponse } from '@/data/auth/auth';
import type { SignInOutput } from 'aws-amplify/auth';
import type { Session } from '@/data/models/session.model';

// Re-export for convenience
export type { AuthResponse };

// ─── Singleton session ────────────────────────────────────────────────────────
// SessionService is a class instance (B05)
const sessionService = new SessionService();

// ─── SetupService ─────────────────────────────────────────────────────────────

/**
 * Orchestrates authentication and user-setup flows.
 * All public methods are async and return plain values (no Angular decorators).
 */
export class SetupService {
  /**
   * Closes the user session.
   * @returns {Promise<boolean>} True if sign-out was successful.
   */
  static async signOut(): Promise<boolean> {
    const response = await authService.SignOut();
    return response.success;
  }

  /**
   * Signs in with a phone number.
   * On success, stores the phone in session and fetches the authenticated user.
   * @param {string} phone - User's phone number.
   * @returns {Promise<AuthResponse<SignInOutput>>}
   */
  static async signIn(phone: string): Promise<AuthResponse<SignInOutput>> {
    const response = await authService.SignIn(phone);
    if (response.success) {
      await sessionService.setInfoField('phone', phone);
      if (response.data.isSignedIn) {
        await this.currentAuthenticatedUser();
      }
      return response;
    }
    return response;
  }

  /**
   * Confirms the OTP/MFA code for sign-in.
   * @param {string} code - The verification code.
   * @returns {Promise<boolean>} True if confirmation succeeded.
   */
  static async confirmSignIn(code: string): Promise<boolean> {
    const response = await authService.ConfirmSignIn(code);
    if (response.success) {
      await this.currentAuthenticatedUser();
    }
    return response.success;
  }

  /**
   * Re-sends the sign-in verification code using the stored phone number.
   * @returns {Promise<boolean>}
   */
  static async reSendCodeSignIn(): Promise<boolean> {
    const phone: string = (await sessionService.getInfo()).phone ?? '';
    if (phone !== '') {
      return (await this.signIn(phone)).success;
    }
    return false;
  }

  /**
   * Gets the current user parameters from session.
   * @returns {Promise<Session>}
   */
  static async getParametersUser(): Promise<Session> {
    return await sessionService.getInfo();
  }

  /**
   * Sets the user's name and lastName in session.
   * @param {string} name
   * @param {string} lastName
   * @returns {Promise<void>}
   */
  static async setParametersUser(
    name: string,
    lastName: string,
  ): Promise<void> {
    await sessionService.setInfoField('name', name);
    await sessionService.setInfoField('lastName', lastName);
  }

  /**
   * Registers a new user with the given phone number.
   * On success, stores the userID and phone in session.
   * If the username already exists, re-sends the verification code.
   * @param {string} phone
   * @returns {Promise<boolean>}
   */
  static async signUp(phone: string): Promise<boolean> {
    const name: string = (await sessionService.getInfo()).name ?? '';
    const lastName: string = (await sessionService.getInfo()).lastName ?? '';
    const response = await authService.SignUp(name, phone, lastName);

    if (response.success) {
      if ('userId' in response.data) {
        await sessionService.setInfoField('userID', response.data.userId);
        await sessionService.setInfoField('phone', phone);
        return true;
      }
    } else {
      if (response.error.name === 'UsernameExistsException') {
        return authService.ResendVerificationCode(phone);
      }
    }
    return false;
  }

  /**
   * Confirms the registration code.
   * @param {string} code
   * @returns {Promise<boolean>}
   */
  static async confirmSignUp(code: string): Promise<boolean> {
    const phone: string = (await sessionService.getInfo()).phone ?? '';
    const response = await authService.ConfirmSignUp(phone, code);
    if (response.success) {
      await this.currentAuthenticatedUser();
    }
    return response.success;
  }

  /**
   * Re-sends the sign-up verification code.
   * @returns {Promise<boolean>}
   */
  static async reSendCodeSignUp(): Promise<boolean> {
    const phone: string = (await sessionService.getInfo()).phone ?? '';
    if (phone !== '') {
      return await this.signUp(phone);
    }
    return false;
  }

  /**
   * Fetches the currently authenticated user's info and stores it in session.
   * @returns {Promise<boolean>} True if a user is authenticated.
   */
  static async currentAuthenticatedUser(): Promise<boolean> {
    const response = await authService.CurrentAuthenticatedUser();
    if (
      response.success &&
      authService.isGetCurrentUserOutput(response.data)
    ) {
      const attributes = await authService.CurrentUserAttributes();
      await sessionService.setInfoField('userID', response.data.userId);
      if (attributes.success) {
        await sessionService.setInfoField('name', attributes.data.name);
        await sessionService.setInfoField(
          'lastName',
          attributes.data.family_name,
        );
        await sessionService.setInfoField(
          'phone',
          attributes.data.phone_number,
        );
      }
    }
    return response.success;
  }

  /**
   * Creates a new user in the API and initializes their progress.
   * Skips creation if the user already exists.
   * @returns {Promise<boolean>}
   */
  static async createNewUser(): Promise<boolean> {
    const userID = (await sessionService.getInfo()).userID ?? '';
    const name = (await sessionService.getInfo()).name ?? '';
    const lastName = (await sessionService.getInfo()).lastName ?? '';
    const phone = (await sessionService.getInfo()).phone ?? '';

    const userExist = await userAPIService.getUser({ id: userID });
    if (userExist.success) {
      if (userExist.data.getUser) {
        return true; // User already exists — no need to create
      }
    } else {
      return false;
    }

    const response = await userAPIService.createUser({
      id: userID,
      Name: name,
      LastName: lastName,
      PhoneNumber: phone,
    });

    if (response.success) {
      await userProgressAPIService.createUserProgress({
        userID,
        ts: new Date().toISOString(),
        Seed: 0,
        Streak: 0,
      });
      return true;
    } else {
      return false;
    }
  }
}
