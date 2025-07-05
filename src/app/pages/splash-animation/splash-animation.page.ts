import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth/auth.service';
import { SessionService } from '@app/core/services/session/session.service';
import { RacimoDSService } from '@app/core/services/storage/datastore/racimo-ds.service';
import { SyncMonitorDSService } from '@app/core/services/storage/datastore/sync-monitor-ds.service';
import { UvaDSService } from '@app/core/services/storage/datastore/uva-ds.service';

import { Animation, AnimationController } from '@ionic/angular';
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
  /* eslint-disable no-console */
  /**
   * Verifies user authentication and navigates to the appropriate page.
   * Implements offline-first authentication strategy.
   * @memberof SplashAnimationPage
   */
  async checkUserAuthentication(): Promise<void> {
    try {
      console.log('🔍 Starting authentication check...');

      // Primero verificar DataStore local
      console.log('📊 Checking DataStore sync status...');
      await SyncMonitorDSService.waitForSyncDataStore();

      console.log('👤 Checking for local user data...');
      const localUser = await UserDSService.getUser();

      if (localUser) {
        console.log('✅ Local user found, attempting offline-first flow...');

        // Usuario existe en DataStore, intentar validar auth solo si hay internet
        if (SyncMonitorDSService.networkStatus) {
          console.log('🌐 Network available, validating authentication...');

          try {
            const response = await this.auth.CurrentAuthenticatedUser();
            if (!response.success) {
              console.log(
                '❌ Auth validation failed with internet, redirecting to login',
              );
              void this.redirectToPage('/login');
              return;
            }

            console.log(
              '✅ Auth validation successful, continuing with online flow',
            );
            await this.continueWithAuthenticatedFlow(response.data.userId);
          } catch (authError) {
            console.error('⚠️ Auth validation error with internet:', authError);
            // Si falla auth con internet, algo está mal, redirigir a login
            void this.redirectToPage('/login');
            return;
          }
        } else {
          console.log(
            '📱 No network, continuing with offline flow using local data',
          );
          // Sin internet, usar datos locales y obtener userID de la sesión
          const sessionInfo = await this.session.getInfo();
          if (sessionInfo.userID) {
            await this.continueWithAuthenticatedFlow(sessionInfo.userID);
          } else {
            console.log('❌ No userID in session, redirecting to login');
            void this.redirectToPage('/login');
          }
        }
      } else {
        console.log(
          '❌ No local user data found, requiring fresh authentication',
        );

        // No hay datos locales, requiere autenticación completa
        const response = await this.auth.CurrentAuthenticatedUser();
        if (!response.success) {
          console.log('❌ Fresh authentication failed, redirecting to login');
          void this.redirectToPage('/login');
          return;
        }

        console.log('✅ Fresh authentication successful');
        await this.continueWithAuthenticatedFlow(response.data.userId);
      }
    } catch (err) {
      console.error('💥 Authentication check failed:', err);
      void this.redirectToPage('/login');
    }
  }
  /**
   * Continues the authenticated flow after successful authentication or offline validation.
   * @param {string} userID - The authenticated user ID
   * @memberof SplashAnimationPage
   */
  async continueWithAuthenticatedFlow(userID: string): Promise<void> {
    try {
      console.log('🚀 Continuing with authenticated flow for user:', userID);

      void this.session.setInfoField('userID', userID);

      // Check if the user has an assigned UVA
      console.log('🍇 Checking UVA assignment...');
      const uva = await UvaDSService.getUVAByuserID(userID);
      if (!uva) {
        console.log('❌ No UVA found, redirecting to project validation');
        void this.redirectToPage('register/validate-project');
        return;
      }

      // Check if the UVA has an associated racimo ID
      const racimoID = uva.racimoID ?? '';
      if (!racimoID) {
        console.log('❌ No racimo ID found, redirecting to project validation');
        void this.redirectToPage('register/validate-project');
        return;
      }

      // Verify user still exists (redundant check but kept for safety)
      const user = await UserDSService.getUser();
      if (!user) {
        console.log('❌ User data inconsistency detected');
        return;
      }

      // Check if the racimo has a valid code
      console.log('🔗 Checking racimo code...');
      const racimoCode = await RacimoDSService.getRacimoCode(racimoID);
      if (racimoCode) {
        console.log('✅ All validations passed, navigating to home');

        void this.session.setInfoField('uvaID', uva.id);
        void this.session.setInfoField('racimoID', racimoID);
        void this.session.setInfoField('racimoLinkCode', racimoCode);

        void this.redirectToPage('app/tabs/home');
      } else {
        console.log(
          '❌ No valid racimo code, redirecting to project validation',
        );
        void this.redirectToPage('register/validate-project');
      }
    } catch (err) {
      console.error('💥 Error in authenticated flow:', err);
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
