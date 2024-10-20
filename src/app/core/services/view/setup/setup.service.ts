import { Injectable } from '@angular/core';
import { AuthService,AuthResponse } from '@app/core/services/auth/auth.service';
import { SessionService } from '../../session/session.service';
import { Session } from 'src/models/session.model';

@Injectable({
  providedIn: 'root',
})
export class SetupService {
  constructor(private auth: AuthService, private sesion: SessionService) {}

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

  async sendCodeConfirmation():Promise<boolean> {
    const phone: string = (await this.sesion.getInfo()).phone ?? '';
    if (phone != '') {
      return (await this.signIn(phone)).success;
    }
    return false;
  }

  async getParametersUser(): Promise<Session> {
    return await this.sesion.getInfo();
  }

  async setParametersUser(name: string, lastName: string) {
    await this.sesion.setInfoField('name', name);
    await this.sesion.setInfoField('lastName', lastName);
  }

  async signUp(phone: string): Promise<boolean> {
    const name: string = (await this.sesion.getInfo()).name ?? '';
    const lastName: string = (await this.sesion.getInfo()).lastName ?? '';
    const response = await this.auth.SignUp(name, phone, lastName);

    if(response.success){
      if('userId' in response.data){
        await this.sesion.setInfoField('userID', response.data.userId);
        await this.sesion.setInfoField('phone', phone);
        return true
      }
    }
    else{
      if(response.error.name ==='UsernameExistsException'){
        return this.auth.ResendVerificationCode(phone);
      }
    }
    return false;

  }

  async confirmSignUp(code: string): Promise<boolean> {
    const response = await this.auth.ConfirmSignUp(
      (await this.sesion.getInfo()).phone ?? '',
      code
    );
    return response.success;
  }
  
  async currentAuthenticatedUser(): Promise<boolean> {
    const response = await this.auth.CurrentAuthenticatedUser();
    if(response.success && this.auth.isGetCurrentUserOutput(response.data)){
      this.sesion.setInfoField("userID", response.data.userId);
      this.sesion.setInfoField("phone", response.data.username);
    }
    return response.success;
  }
}

