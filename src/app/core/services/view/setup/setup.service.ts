import { Injectable } from '@angular/core';
import { AuthService } from '@app/core/services/auth/auth.service';
import { SessionService } from '../../session/session.service';
import { Session } from 'src/models/session.model';

@Injectable({
  providedIn: 'root'
})
export class SetupService {

  constructor(private auth:AuthService, private sesion: SessionService) { }

  async signIn(phone: string): Promise<any>{
    const response = await this.auth.SignIn(phone);
    if(!response.error){
      await this.sesion.setInfoField("phone", phone);
    }
    return response;
  }

  async confirmSignIn(code: string): Promise<any>{
    const response = await this.auth.ConfirmSignIn(code);
       return response;
  }

  async sendCodeConfirmation(){
    const phone:string = (await this.sesion.getInfo()).phone ?? '';
    if(phone!=''){
      this.signIn(phone);
    }
  }

  async getParametersUser(): Promise<Session>{
    return (await this.sesion.getInfo());
  }

  async setParametersUser(name:string, lastName:string){
    await this.sesion.setInfoField("name", name);
    await this.sesion.setInfoField("lastName", lastName);
  }

  async signUp(phone:string):Promise<any>{
    const name:string = (await this.sesion.getInfo()).name ?? '';
    const lastName:string = (await this.sesion.getInfo()).lastName ?? '';
    const response = await this.auth.SignUp(name,phone, lastName)
   
    if(response && 'error' in response){
      if (response.error.name === 'UsernameExistsException'){
        return this.auth.ResendVerificationCode(phone);
      }
    }

    if(response && 'userId' in response){
      await this.sesion.setInfoField("userID", response.userId);
      await this.sesion.setInfoField("phone", phone);
    }
    

    return response;
  }

  async confirmSignUp(code: string): Promise<any>{
    const response = await this.auth.ConfirmSignUp(
      (await this.sesion.getInfo()).phone ?? '',
      code
    );
    return response;
  }
}
