import { Injectable } from '@angular/core';
import {
  signIn,
  getCurrentUser,
  type SignInInput,
  confirmSignIn,
  signOut,
  SignInOutput,
  ConfirmSignInInput,
} from 'aws-amplify/auth';
import {
  signUp,
  confirmSignUp,
  GetCurrentUserOutput,
  type ConfirmSignUpInput,
  resendSignUpCode,
  SignUpOutput,
  AuthError,
} from 'aws-amplify/auth';

interface errorAuthResponse {
  mensage?: string;
  name?: string;
  type?: 'validation' | 'network' | 'authentication' | 'unknown';
}

// Tipo para la respuesta exitosa
interface AuthSuccessResponse {
  success: true;
  data: SignInOutput | SignUpOutput | GetCurrentUserOutput;
}

// Tipo para la respuesta de error
interface AuthErrorResponse {
  success: false;
  error: errorAuthResponse;
}

// Unión de ambos tipos en la interfaz principal
export type AuthResponse = AuthSuccessResponse | AuthErrorResponse;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor() {}
  private handleAuthError(err: unknown): errorAuthResponse {
    console.error(err);
    if (err instanceof AuthError) {
      // Manejo específico para AuthError
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
      return { name: 'unexpecteError', mensage: err.message, type: 'unknown' };
    } else {
      return {
        name: 'unknownerror',
        mensage: 'unknown error',
        type: 'unknown',
      };
    }
  }
  // Type Guard para GetCurrentUserOutput
  isGetCurrentUserOutput(data: any): data is GetCurrentUserOutput {
    return (data as GetCurrentUserOutput) !== undefined;
  }

  /**
   * Inicia sesión con el número de teléfono del usuario.
   * @param {string} phone - El número de teléfono del usuario.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado del inicio de sesión.
   */
  async SignIn(phone: string): Promise<AuthResponse> {
    try {
      return {
        success: true,
        data: await signIn({ username: phone, password: phone }),
      };
    } catch (err: unknown) {
      return { success: false, error: this.handleAuthError(err) };
    }
  }

  /**
   * Confirma el inicio de sesión con un código de desafío.
   * @param {string} code - El código de confirmación enviado al usuario.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado de la confirmación.
   */
  async ConfirmSignIn(code: string): Promise<AuthResponse> {
    try {
      return {
        success: true,
        data: await confirmSignIn({ challengeResponse: code }),
      };
    } catch (err: unknown) {
      return { success: false, error: this.handleAuthError(err) };
    }
  }

  /**
   * Cierra la sesión del usuario actual.
   * @returns {Promise<AuthResponse>} La respuesta con el resultado de cerrar sesión.
   */
  async SignOut(): Promise<any> {
    try {
      signOut();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: this.handleAuthError(err) };
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
  ): Promise<AuthResponse> {
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
      return { success: false, error: this.handleAuthError(err) };
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
  ): Promise<AuthResponse> {
    try {
      return {
        success: true,
        data: await confirmSignUp({ username: phone, confirmationCode }),
      };
    } catch (err: unknown) {
      return { success: false, error: this.handleAuthError(err) };
    }
  }

  /**
   * Reenvía el código de verificación de registro al usuario.
   * @param {string} phone - El número de teléfono del usuario.
   * @returns {Promise<void>} No devuelve nada si la operación tiene éxito, pero lanza un error si falla.
   */
  async ResendVerificationCode(phone: string): Promise<boolean> {
    try {
      await resendSignUpCode({ username: phone });
      console.log('Verification code resent');
      return true;
    } catch (err) {
      console.error('Error resending the code:', this.handleAuthError(err));
      throw new Error('Error resending the code');
      return false;
    }
  }

  async CurrentAuthenticatedUser(): Promise<AuthResponse> {
    try {
      const currentUser = await getCurrentUser();
      console.log('El usuario ya está autenticado:', currentUser);
      return { success: true, data: currentUser };
    } catch (err: unknown) {
      return { success: false, error: this.handleAuthError(err) };
    }
  }
}
