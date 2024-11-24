import { Injectable } from '@angular/core';
import {
  signIn,
  deleteUser,
  getCurrentUser,
  confirmSignIn,
  signOut,
  SignInOutput,
  fetchUserAttributes,
  FetchUserAttributesOutput,
  ConfirmSignInOutput,
  ConfirmSignUpOutput,
} from 'aws-amplify/auth';
import {
  signUp,
  confirmSignUp,
  GetCurrentUserOutput,
  resendSignUpCode,
  SignUpOutput,
  AuthError,
} from 'aws-amplify/auth';

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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  /**
   * Creates an instance of AuthService.
   * @memberof AuthService
   */
  constructor() {}
  /**
   * Maneja errores de autenticación específicos y genera una respuesta de error.
   * @param {unknown} err - El error capturado durante el proceso de autenticación.
   * @returns {errorAuthResponse} Un objeto que contiene detalles del error de autenticación.
   * @private
   */
  private handleAuthError(err: unknown): errorAuthResponse {
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
  /**
   * Verifica si los datos recibidos son del tipo `GetCurrentUserOutput`.
   * @param {SignInOutput | SignUpOutput | GetCurrentUserOutput} data - Datos a verificar.
   * @returns {data is GetCurrentUserOutput} True si los datos son del tipo `GetCurrentUserOutput`.
   * @private
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
  async ConfirmSignIn(
    code: string,
  ): Promise<AuthResponse<ConfirmSignInOutput>> {
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
  async SignOut(): Promise<SignOutResult> {
    try {
      await signOut();
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
  ): Promise<AuthResponse<ConfirmSignUpOutput>> {
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
      return true;
    } catch (err) {
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
      return { success: false, error: this.handleAuthError(err) };
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
      return { success: false, error: this.handleAuthError(err) };
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
