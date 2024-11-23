import { Injectable } from '@angular/core';
import { App } from '@capacitor/app';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class AppMinimizeService {
  /**
   * @param {Platform} platform Platform type
   */
  constructor(private platform: Platform) {}

  /**
   * Navigates to home cellphone.
   * @returns {void}
   */
  appMinimize(): void {
    void App.exitApp();
  }

  /**
   * Sets up the back button listener to minimize the app.
   */
  initializeBackButtonHandler(): void {
    this.platform.backButton.subscribeWithPriority(10, () => {
      void App.exitApp();
    });
  }
}
