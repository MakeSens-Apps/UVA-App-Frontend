import { Injectable } from '@angular/core';
import { signIn, type SignInInput, confirmSignIn, signOut, ConfirmSignInInput, } from 'aws-amplify/auth';
import { signUp,confirmSignUp, type ConfirmSignUpInput, resendSignUpCode, AuthError } from 'aws-amplify/auth';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }
  // Handle Sign In
  async SignIn(phone:string): Promise<any> {
    try {
      
      const { isSignedIn, nextStep } = await signIn({ username : phone, password: phone });
      return { isSignedIn, nextStep };
    } catch (error) {
      return {error};
    }
  }
  // Handle Confirm Sign In (for challenges like MFA)
  async ConfirmSignIn( code : string): Promise<any> {
    try {
      const { isSignedIn, nextStep } = await confirmSignIn( {challengeResponse: code} );
      return { isSignedIn, nextStep };
    } catch (error) {
      return {error};
    }
  }

  // Handle Sign Out
  async SignOut(): Promise<any> {
    try {
      await signOut();
      return {message: "Sesion cerrada correctamente"};
    } catch (error) {
      return {error};
    }
  }

  async SignUp(name:string, phone:string, lastName:string){
    try {
      const { isSignUpComplete, userId, nextStep } = await signUp({
        username: phone,
        password: phone,
        options: {
          userAttributes: {
            phone_number: phone, // E.164 number convention
            family_name: lastName,
            name: name
          },
          // optional
          //autoSignIn: true // or SignInOptions e.g { authFlowType: "USER_SRP_AUTH" }
        }
      });

      
      return { isSignUpComplete, userId, nextStep };
    } catch (error : any ) {
      return {error};
    }
  }
  
  async ConfirmSignUp( phone:string, confirmationCode:string  ) {
    try {
      const { isSignUpComplete, nextStep } = await confirmSignUp({
        username:phone,
        confirmationCode:confirmationCode
      });
      return { isSignUpComplete, nextStep } ;

    } catch (error) {
      
      return {error};
    }
  }

  // Método para reenviar el código de verificación al usuario
  async ResendVerificationCode(phone: string): Promise<void> {
    try {
      // Reenvía el código de verificación
      await resendSignUpCode({username:phone});
      console.log('Código de verificación reenviado');
    } catch (error) {
      console.error('Error reenviando el código:', error);
      throw new Error('Error reenviando el código');
    }
  }
}

