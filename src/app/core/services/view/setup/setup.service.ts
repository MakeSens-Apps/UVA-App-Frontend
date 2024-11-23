import { Injectable } from '@angular/core';
import {
  AuthService,
  AuthResponse,
} from '@app/core/services/auth/auth.service';
import { SessionService } from '../../session/session.service';
import { Session } from 'src/models/session.model';
import { UserAPIService } from '../../api/user-api.service';
import { UserProgressAPIService } from '../../api/user-progress-api.service';
import { SignInOutput } from 'aws-amplify/auth';
import { identifyUser } from 'aws-amplify/analytics';

@Injectable({
  providedIn: 'root',
})
/**
 * Servicio para manejar las acciones de autenticación y gestión de usuarios, como iniciar/cerrar sesión,
 * registro de usuario, confirmación de código, y almacenamiento de información en sesión.
 * @class SetupService
 */
export class SetupService {
  /**
   * Crea una instancia de SetupService.
   * @param {AuthService} auth - Servicio de autenticación para manejar login, registro, etc.
   * @param {SessionService} sesion - Servicio de sesión para almacenar la información del usuario.
   * @param {UserAPIService} userAPI - API para gestionar la creación de usuarios.
   * @param {UserProgressAPIService} userProgressAPI - API para gestionar el progreso del usuario.
   * @memberof SetupService
   */
  constructor(
    private auth: AuthService,
    private sesion: SessionService,
    private userAPI: UserAPIService,
    private userProgressAPI: UserProgressAPIService,
  ) {}

  /**
   * Cierra la sesión del usuario.
   * @returns {Promise<boolean>} Indica si el cierre de sesión fue exitoso.
   * @memberof SetupService
   */
  async signOut(): Promise<boolean> {
    const response = await this.auth.SignOut();
    return response.success;
  }

  /**
   * Inicia sesión con el número de teléfono del usuario.
   * @param {string} phone - Número de teléfono del usuario.
   * @returns {Promise<AuthResponse>} Respuesta de la autenticación.
   * @memberof SetupService
   */
  async signIn(phone: string): Promise<AuthResponse<SignInOutput>> {
    const response = await this.auth.SignIn(phone);
    if (response.success) {
      await this.sesion.setInfoField('phone', phone);
      return response;
    }
    return response;
  }

  /**
   * Confirma el código de verificación para el inicio de sesión.
   * @param {string} code - Código de verificación recibido por el usuario.
   * @returns {Promise<boolean>} Indica si la confirmación fue exitosa.
   * @memberof SetupService
   */
  async confirmSignIn(code: string): Promise<boolean> {
    const response = await this.auth.ConfirmSignIn(code);
    if (response.success) {
      await this.currentAuthenticatedUser();
    }
    return response.success;
  }

  /**
   * Reenvía el código de verificación para el inicio de sesión.
   * @returns {Promise<boolean>} Indica si el reenvío fue exitoso.
   * @memberof SetupService
   */
  async reSendCodeSignIn(): Promise<boolean> {
    const phone: string = (await this.sesion.getInfo()).phone ?? '';
    if (phone != '') {
      return (await this.signIn(phone)).success;
    }
    return false;
  }

  /**
   * Obtiene los parámetros actuales del usuario almacenados en la sesión.
   * @returns {Promise<Session>} Información de la sesión del usuario.
   * @memberof SetupService
   */
  async getParametersUser(): Promise<Session> {
    return await this.sesion.getInfo();
  }

  /**
   * Establece los parámetros del usuario (nombre y apellido) en la sesión.
   * @param {string} name - Nombre del usuario.
   * @param {string} lastName - Apellido del usuario.
   * @returns {Promise<void>}
   * @memberof SetupService
   */
  async setParametersUser(name: string, lastName: string): Promise<void> {
    await this.sesion.setInfoField('name', name);
    await this.sesion.setInfoField('lastName', lastName);
  }

  /**
   * Registra a un nuevo usuario utilizando el número de teléfono.
   * @param {string} phone - Número de teléfono del usuario.
   * @returns {Promise<boolean>} Indica si el registro fue exitoso.
   * @memberof SetupService
   */
  async signUp(phone: string): Promise<boolean> {
    const name: string = (await this.sesion.getInfo()).name ?? '';
    const lastName: string = (await this.sesion.getInfo()).lastName ?? '';
    const response = await this.auth.SignUp(name, phone, lastName);

    if (response.success) {
      if ('userId' in response.data) {
        await this.sesion.setInfoField('userID', response.data.userId);
        await this.sesion.setInfoField('phone', phone);
        return true;
      }
    } else {
      if (response.error.name === 'UsernameExistsException') {
        return this.auth.ResendVerificationCode(phone);
      }
    }
    return false;
  }

  /**
   * Confirma el registro del usuario utilizando un código de verificación.
   * @param {string} code - Código de verificación recibido por el usuario.
   * @returns {Promise<boolean>} Indica si la confirmación fue exitosa.
   * @memberof SetupService
   */
  async confirmSignUp(code: string): Promise<boolean> {
    const phone: string = (await this.sesion.getInfo()).phone ?? '';
    const response = await this.auth.ConfirmSignUp(phone, code);
    if (response.success) {
      await this.currentAuthenticatedUser();
    }
    return response.success;
  }

  /**
   * Reenvía el código de verificación para el registro de usuario.
   * @returns {Promise<boolean>} Indica si el reenvío fue exitoso.
   * @memberof SetupService
   */
  async reSendCodeSignUp(): Promise<boolean> {
    const phone: string = (await this.sesion.getInfo()).phone ?? '';
    if (phone != '') {
      return await this.signUp(phone);
    }
    return false;
  }

  /**
   * Obtiene la información del usuario autenticado actualmente.
   * @returns {Promise<boolean>} Indica si la obtención de la información fue exitosa.
   * @memberof SetupService
   */
  async currentAuthenticatedUser(): Promise<boolean> {
    const response = await this.auth.CurrentAuthenticatedUser();
    if (response.success && this.auth.isGetCurrentUserOutput(response.data)) {
      const attributes = await this.auth.CurrentUserAttributes();
      await this.sesion.setInfoField('userID', response.data.userId);
      if (attributes.success) {
        await this.sesion.setInfoField('name', attributes.data.name);
        await this.sesion.setInfoField('lastName', attributes.data.family_name);
        await this.sesion.setInfoField('phone', attributes.data.phone_number);
      }
      const userProfile = {
        userID: response.data.userId,
        name: response.data.username,
        lastName: (await this.sesion.getInfo()).lastName ?? '',
        phone: (await this.sesion.getInfo()).phone ?? '',
      };

      await identifyUser({
        userId: response.data.userId,
        userProfile,
      });
    }
    return response.success;
  }

  /**
   * Crea un nuevo usuario en la API de usuarios y registra el progreso inicial del usuario.
   * @returns {Promise<boolean>} Indica si la creación del usuario y su progreso fue exitosa.
   * @memberof SetupService
   */
  async createNewUser(): Promise<boolean> {
    const userID = (await this.sesion.getInfo()).userID ?? '';
    const name = (await this.sesion.getInfo()).name ?? '';
    const lastName = (await this.sesion.getInfo()).lastName ?? '';
    const phone = (await this.sesion.getInfo()).phone ?? '';
    const userExist = await this.userAPI.getUser({ id: userID });
    if (userExist.success) {
      if (userExist.data.getUser) {
        //Existe un usuario no es necesario crearlo
        return true;
      }
    } else {
      return false;
    }
    const response = await this.userAPI.createUser({
      id: userID,
      Name: name,
      LastName: lastName,
      PhoneNumber: phone,
    });
    if (response.success) {
      await this.userProgressAPI.createUserProgress({
        userID: userID,
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
