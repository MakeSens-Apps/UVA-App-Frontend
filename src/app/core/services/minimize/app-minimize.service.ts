import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AppMinimizeService {

    constructor( private platform: Platform) {}

  /**
   * Navigates to home cellphone.
   * @returns {void}
   */
  appMinimize(): void {
    App.exitApp(); 
  }

    /**
   * Sets up the back button listener to minimize the app.
   */
    initializeBackButtonHandler(): void {
      this.platform.backButton.subscribeWithPriority(10, () => {
        App.exitApp(); 
      });
    }
}
