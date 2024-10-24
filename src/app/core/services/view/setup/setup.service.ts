import { Injectable } from '@angular/core';
import {
  AuthService,
  AuthResponse,
} from '@app/core/services/auth/auth.service';
import { SessionService } from '../../session/session.service';
import { Session } from 'src/models/session.model';
import { UserAPIService } from '../../api/user-api.service';
import { UserProgressAPIService } from '../../api/user-progress-api.service';
@Injectable({
  providedIn: 'root',
})
export class SetupService {
  constructor(
    private auth: AuthService,
    private sesion: SessionService,
    private userAPI: UserAPIService,
    private userProgressAPI: UserProgressAPIService,
  ) {}

  async signOut(): Promise<boolean> {
    const response = await this.auth.SignOut();
    return response.success;
  }

  async signIn(phone: string): Promise<AuthResponse> {
    const response = await this.auth.SignIn(phone);
    if (response.success) {
      await this.sesion.setInfoField('phone', phone);
      return response;
    }
    return response;
  }

  async confirmSignIn(code: string): Promise<boolean> {
    const response = await this.auth.ConfirmSignIn(code);
    return response.success;
  }

  async reSendCodeSignIn(): Promise<boolean> {
    const phone: string = (await this.sesion.getInfo()).phone ?? '';
    if (phone != '') {
      return (await this.signIn(phone)).success;
    }
    return false;
  }

  async getParametersUser(): Promise<Session> {
    return await this.sesion.getInfo();
  }

  async setParametersUser(name: string, lastName: string): Promise<void> {
    await this.sesion.setInfoField('name', name);
    await this.sesion.setInfoField('lastName', lastName);
  }

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

  async confirmSignUp(code: string): Promise<boolean> {
    const phone: string = (await this.sesion.getInfo()).phone ?? '';
    const response = await this.auth.ConfirmSignUp(phone, code);
    return response.success;
  }

  async reSendCodeSignUp(): Promise<boolean> {
    const phone: string = (await this.sesion.getInfo()).phone ?? '';
    if (phone != '') {
      return await this.signUp(phone);
    }
    return false;
  }
  async currentAuthenticatedUser(): Promise<boolean> {
    const response = await this.auth.CurrentAuthenticatedUser();
    if (response.success && this.auth.isGetCurrentUserOutput(response.data)) {
      await this.sesion.setInfoField('userID', response.data.userId);
      await this.sesion.setInfoField('phone', response.data.username);
    }
    return response.success;
  }

  async createNewUser(): Promise<boolean> {
    const userID = (await this.sesion.getInfo()).userID ?? '';
    const name = (await this.sesion.getInfo()).name ?? '';
    const lastName = (await this.sesion.getInfo()).lastName ?? '';
    const phone = (await this.sesion.getInfo()).phone ?? '';

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
    }
    return true;
  }
}
