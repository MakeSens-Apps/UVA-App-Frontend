/**
 * B04 — AuthService
 * Ported from: src/app/core/services/auth/auth.service.ts
 * Classification: Minor adaptation
 * Changes:
 *   - Removed @Injectable({ providedIn: 'root' }) — exported singleton instance
 *   - Constructor DI replaced: TestUsersService → direct import of isTestUser function
 *   - handleAuthError: private method → module-local function (no private this needed)
 *   - Import paths updated to mobile/ structure
 *
 * PRESERVED:
 *   - All aws-amplify/auth imports identical to original
 *   - handleAuthError switch on AuthError.name → type (portability-matrix §3.2 auth.service.ts)
 *   - typo 'mensage' (load-bearing contract, §4.4)
 *   - MFA SMS PREFERRED flow: updateMFAPreference for non-test users
 *   - passwordless pattern: username=phone, password=phone
 */

import {
  signIn,
  deleteUser,
  getCurrentUser,
  confirmSignIn,
  signOut,
  signUp,
  confirmSignUp,
  resendSignUpCode,
  updateMFAPreference,
  fetchUserAttributes,
  SignInOutput,
  SignUpOutput,
  ConfirmSignInOutput,
  ConfirmSignUpOutput,
  GetCurrentUserOutput,
  FetchUserAttributesOutput,
  AuthError,
} from 'aws-amplify/auth';
import { isTestUser } from './test-users';

interface SignOutResult {
  success: boolean;
  error?: errorAuthResponse; // El campo 'error' es opcional ya que solo se incluye en caso de fallo
}

interface errorAuthResponse {
  mensage?: string;
  name?: string;
  type?: 'validation' | 'network' | 'authentication' | 'unknown';
}

// Tipo para la respuesta exitosa
interface AuthSuccessResponse<T> {
  success: true;
  data: T;
}

// Tipo para la respuesta de error
interface AuthErrorResponse {
  success: false;
  error: errorAuthResponse;
}

// Unión de ambos tipos en la interfaz principal
export type AuthResponse<T> = AuthSuccessResponse<T> | AuthErrorResponse;

/**
 * Maneja errores de autenticación específicos y genera una respuesta de error.
 * @param {unknown} err - El error capturado durante el proceso de autenticación.
 * @returns {errorAuthResponse} Un objeto que contiene detalles del error de autenticación.
 *
 * PRESERVED: AuthError.name switch (ramaje original) — portability-matrix §3.2
 * NOTE: typo 'mensage' is load-bearing — DO NOT rename without coordinated refactor
 */
function handleAuthError(err: unknown): errorAuthResponse {
  if (err instanceof AuthError) {
    // Manejo específico para AuthError
    console.error(err.name);
    switch (err.name) {
      case 'UserNotFoundException':
        return {
          name: err.name,
          mensage: err.message,
          type: 'authentication',
        };
      case 'NotAuthorizedException':
        return { name: err.name, mensage: err.message, type: 'validation' };
      case 'CodeMismatchException':
        return { name: err.name, mensage: err.message, type: 'validation' };
      case 'NetworkError':
        return { name: err.name, mensage: err.message, type: 'network' };
      default:
        return { name: err.name, mensage: err.message, type: 'unknown' };
    }
  } else if (err instanceof Error) {
    console.error('unexpecteError');
    return { name: 'unexpecteError', mensage: err.message, type: 'unknown' };
  } else {
    console.error('unknownerror');
    return {
      name: 'unknownerror',
      mensage: 'unknown error',
      type: 'unknown',
    };
  }
}

class AuthService {
  /**
   * Verifica si los datos recibidos son del tipo `GetCurrentUserOutput`.
   * @param {SignInOutput | SignUpOutput | GetCurrentUserOutput} data - Datos a verificar.
   * @returns {data is GetCurrentUserOutput} True si los datos son del tipo `GetCurrentUserOutput`.
   */
  isGetCurrentUserOutput(
    data: SignInOutput | SignUpOutput | GetCurrentUserOutput,
  ): data is GetCurrentUserOutput {
    return (data as GetCurrentUserOutput) !== undefined;
  }

  /**
   * Inicia sesión con el número de teléfono del usuario.
   * @param {string} phone - El número de teléfono del usuario.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado del inicio de sesión.
   */
  async SignIn(phone: string): Promise<AuthResponse<SignInOutput>> {
    try {
      const signInResponse = await signIn({ username: phone, password: phone });

      // Configure MFA for non-test users on their first login
      if (
        !isTestUser(phone) &&
        signInResponse.isSignedIn
      ) {
        await this.enableMFAForUser();
      }
      if (
        signInResponse.nextStep.signInStep ===
        'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
      ) {
        return await this.ConfirmSignIn(phone);
      }
      return {
        success: true,
        data: signInResponse,
      };
    } catch (err: unknown) {
      return { success: false, error: handleAuthError(err) };
    }
  }

  /**
   * Enables MFA for the given user.
   */
  private async enableMFAForUser(): Promise<void> {
    try {
      await updateMFAPreference({ sms: 'PREFERRED' });
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Confirma el inicio de sesión con un código de desafío.
   * @param {string} code - El código de confirmación enviado al usuario.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado de la confirmación.
   */
  async ConfirmSignIn(
    code: string,
  ): Promise<AuthResponse<ConfirmSignInOutput>> {
    try {
      return {
        success: true,
        data: await confirmSignIn({ challengeResponse: code }),
      };
    } catch (err: unknown) {
      return { success: false, error: handleAuthError(err) };
    }
  }

  /**
   * Cierra la sesión del usuario actual.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado de cerrar sesión.
   */
  async SignOut(): Promise<SignOutResult> {
    try {
      await signOut();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: handleAuthError(err) };
    }
  }

  /**
   * Registra a un nuevo usuario.
   * @param {string} name - El nombre del usuario.
   * @param {string} phone - El número de teléfono del usuario.
   * @param {string} lastName - El apellido del usuario.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado del registro.
   */
  async SignUp(
    name: string,
    phone: string,
    lastName: string,
  ): Promise<AuthResponse<SignUpOutput>> {
    try {
      return {
        success: true,
        data: await signUp({
          username: phone,
          password: phone,
          options: {
            userAttributes: {
              phone_number: phone,
              family_name: lastName,
              name: name,
            },
          },
        }),
      };
    } catch (err: unknown) {
      return { success: false, error: handleAuthError(err) };
    }
  }

  /**
   * Confirma el registro del usuario con un código de verificación.
   * @param {string} phone - El número de teléfono del usuario.
   * @param {string} confirmationCode - El código de confirmación enviado al usuario.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado de la confirmación de registro.
   */
  async ConfirmSignUp(
    phone: string,
    confirmationCode: string,
  ): Promise<AuthResponse<ConfirmSignUpOutput>> {
    try {
      return {
        success: true,
        data: await confirmSignUp({ username: phone, confirmationCode }),
      };
    } catch (err: unknown) {
      return { success: false, error: handleAuthError(err) };
    }
  }

  /**
   * Reenvía el código de verificación de registro al usuario.
   * @param {string} phone - El número de teléfono del usuario.
   * @returns {Promise<boolean>} No devuelve nada si la operación tiene éxito, pero lanza un error si falla.
   */
  async ResendVerificationCode(phone: string): Promise<boolean> {
    try {
      await resendSignUpCode({ username: phone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene el usuario actualmente autenticado.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado de la operación y el usuario actual.
   */
  async CurrentAuthenticatedUser(): Promise<
    AuthResponse<GetCurrentUserOutput>
  > {
    try {
      const currentUser = await getCurrentUser();
      return { success: true, data: currentUser };
    } catch (err: unknown) {
      return { success: false, error: handleAuthError(err) };
    }
  }

  /**
   * Obtiene el usuario actualmente autenticado.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado de la operación y el usuario actual.
   */
  async CurrentUserAttributes(): Promise<
    AuthResponse<FetchUserAttributesOutput>
  > {
    try {
      const currentUser = await fetchUserAttributes();
      return { success: true, data: currentUser };
    } catch (err: unknown) {
      return { success: false, error: handleAuthError(err) };
    }
  }

  /**
   * @returns {Promise<boolean> } La respuesta con el resultado del inicio de sesión.
   */
  async handleDeleteUser(): Promise<boolean> {
    try {
      await deleteUser();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}

/** Singleton — import-level DI replacement (portability-matrix §4.1) */
export const authService = new AuthService();
