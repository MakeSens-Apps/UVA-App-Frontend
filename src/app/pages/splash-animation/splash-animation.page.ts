import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { Animation, AnimationController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SyncMonitorDSService } from '@app/core/services/storage/datastore/sync-monitor-ds.service';
import { SessionService } from '@app/core/services/session/session.service';
import { RacimoDSService } from '@app/core/services/storage/datastore/racimo-ds.service';
import { UvaDSService } from '@app/core/services/storage/datastore/uva-ds.service';
import { AuthService } from '@app/core/services/auth/auth.service';
import { identifyUser } from 'aws-amplify/analytics';
import { UserProfile } from '@aws-amplify/core';
import { Device } from '@capacitor/device';
//import { AppVersion } from '@ionic-native/app-version/ngx';
//import { Globalization } from '@ionic-native/globalization/ngx';
import { UserDSService } from '@app/core/services/storage/datastore/user-ds.service';
@Component({
  selector: 'app-splash-animation',
  templateUrl: './splash-animation.page.html',
  styleUrls: ['./splash-animation.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
  ],
})
export class SplashAnimationPage implements OnInit {
  private leafIconAnimation: Animation | undefined;
  private poweredByAnimation: Animation | undefined;
  private makeSensLogoAnimation: Animation | undefined;
  private endAnimation = false;
  /**
   * Creates an instance of SplashAnimationPage.
   * @param {AnimationController} animationCtrl - The animation controller from Ionic.
   * @param {Router} router - The Router module to navigate between pages.
   * @param {SessionService} session  SessionService
   * @param {AuthService} auth AuthService
   */
  constructor(
    private animationCtrl: AnimationController,
    private router: Router,
    private session: SessionService,
    private auth: AuthService,
  ) {}

  /**
   * Method that is executed when the component initializes.
   * It calls the setupAnimations method and checks if a user is authenticated.
   * @memberof SplashAnimationPage
   */
  async ngOnInit(): Promise<void> {
    // Initialize the animations and start the authentication check
    this.setupAnimations();
    await this.checkUserAuthentication();
  }

  /**
   * Verifies user authentication and navigates to the appropriate page.
   * @memberof SplashAnimationPage
   */
  async checkUserAuthentication(): Promise<void> {
    try {
      // Check if the current user is authenticated
      const response = await this.auth.CurrentAuthenticatedUser();
      if (!response.success) {
        // Redirect to login if no user is authenticated
        void this.redirectToPage('/login');
        return;
      }
      const userID = response.data.userId;
      void this.session.setInfoField('userID', userID);
      // Retrieve the current user's ID
      await SyncMonitorDSService.waitForSyncDataStore();

      // Check if the user has an assigned UVA
      const uva = await UvaDSService.getUVAByuserID(userID);
      if (!uva) {
        void this.redirectToPage('register/validate-project');
        return;
      }

      // Check if the UVA has an associated racimo ID
      const racimoID = uva.racimoID ?? '';
      if (!racimoID) {
        void this.redirectToPage('register/validate-project');
        return;
      }

      const user = await UserDSService.getUser();
      if (!user) {
        return;
      }
      // Check if the racimo has a valid code
      const racimoCode = await RacimoDSService.getRacimoCode(racimoID);
      if (racimoCode) {
        void this.session.setInfoField('uvaID', uva.id);
        void this.session.setInfoField('racimoID', racimoID);
        void this.session.setInfoField('racimoLinkCode', racimoCode);
        await identifyUser({
          userId: response.data.userId,
          userProfile: await getUserProfile({
            name: user.Name,
            phone: user.PhoneNumber,
            racimoCode: racimoCode,
            uvaId: uva.id,
          }),
        });
        void this.redirectToPage('app/tabs/home');
      } else {
        void this.redirectToPage('register/validate-project');
      }
    } catch (err) {
      console.error('No user found', err);
      void this.redirectToPage('/login');
    }
  }

  /**
   * Waits for the animation to finish before allowing further processing.
   * @returns {Promise<void>} Resolves when the animation is finished.
   * @memberof SplashAnimationPage
   */
  waitForAnimationToEnd(): Promise<void> {
    return new Promise((resolve) => {
      const checkAnimationInterval = setInterval(() => {
        if (this.endAnimation) {
          clearInterval(checkAnimationInterval); // Stop checking once animation ends
          resolve(); // Resolve the promise when animation finishes
        }
      }, 100); // Check every 100ms
    });
  }
  /**
   * Navigates the user to the specified page.
   * This function is used for all redirections to ensure consistency.
   * @param {string} path - The path to navigate to.
   * @returns {Promise<boolean>} A promise that resolves to true if navigation was successful.
   * @memberof SplashAnimationPage
   */
  async redirectToPage(path: string): Promise<boolean> {
    await this.waitForAnimationToEnd();
    return this.router.navigate([path]);
  }

  /**
   * Executes when the view has loaded.
   * Starts playing the animations.
   * @memberof SplashAnimationPage
   */
  ionViewDidEnter(): void {
    void this.playAnimations();
  }

  /**
   * Configures the animations for the different splash page elements.
   * Defines the animations for the leaf icon, "Powered by" text, and MakeSens logo.
   * @memberof SplashAnimationPage
   */
  setupAnimations(): void {
    const leafIcon = document.querySelector('.leaf-icon');
    const poweredBy = document.querySelector('.powered-by');
    const makeSensLogo = document.querySelector('.make-sens-logo');

    if (leafIcon && poweredBy && makeSensLogo) {
      this.leafIconAnimation = this.animationCtrl
        .create()
        .addElement(leafIcon)
        .duration(1000)
        .iterations(1)
        .fromTo('transform', 'translateY(-100%)', 'translateY(0)')
        .easing('ease-in-out');

      this.poweredByAnimation = this.animationCtrl
        .create()
        .addElement(poweredBy)
        .duration(1000)
        .iterations(1)
        .fromTo('opacity', '0', '1')
        .easing('ease-in')
        .delay(1000);

      this.makeSensLogoAnimation = this.animationCtrl
        .create()
        .addElement(makeSensLogo)
        .duration(1000)
        .iterations(1)
        .fromTo('opacity', '0', '1')
        .easing('ease-in')
        .delay(1000);
    }
  }

  /**
   * Plays the animations for the splash page elements.
   * Once the animations are completed, navigates based on the user authentication status.
   * @memberof SplashAnimationPage
   */
  playAnimations(): void {
    try {
      void this.leafIconAnimation?.play();
      void this.poweredByAnimation?.play();
      void this.makeSensLogoAnimation?.play();
      void this.makeSensLogoAnimation?.onFinish(() => {
        setTimeout(() => {
          this.endAnimation = true;
        }, 500);
      });
    } catch {
      console.error('Error en la animacion');
    }
  }
}

interface userCustomProperties {
  name: string;
  phone: string;
  racimoCode: string;
  uvaId: string;
}
/**
 * @param {userCustomProperties} customProperties customProperties
 * @returns {Promise<UserProfile>} return UserProfile
 */
async function getUserProfile(
  customProperties: userCustomProperties,
): Promise<UserProfile> {
  // Información básica
  ///onst appVersion = await AppVersion.getVersionNumber(); // Versión de la app
  //const locale = await Globalization.getLocaleName(); // Idioma y región

  // Información del dispositivo
  const deviceInfo = await Device.getInfo();

  // Crear el objeto UserProfile
  const userProfile = {
    customProperties: {
      racimoCode: [customProperties.racimoCode],
      uvaId: [customProperties.uvaId],
      phone: [customProperties.phone],
    },
    demographic: {
      //appVersion: appVersion, // Versión de la aplicación
      //locale: locale.value, // Idioma y región (locale)
      make: deviceInfo.manufacturer, // Marca del dispositivo
      model: deviceInfo.model, // Modelo del dispositivo
      modelVersion: deviceInfo.osVersion, // Versión del sistema operativo
      platform: deviceInfo.platform, // Plataforma (android, ios)
      platformVersion: deviceInfo.osVersion, // Versión del sistema operativo
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Zona horaria*/
    },
    metrics: {
      // Puedes agregar métricas personalizadas si es necesario
      screenWidth: window.innerWidth, // Ejemplo de métrica
    },
    name: 'Miguel', // Nombre del usuario (deberías obtenerlo del estado de la aplicación)
    plan: 'Pro', // Plan del usuario si es relevante
  };

  return userProfile;
}
