import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class AppMinimizeService {
  /**
   * List of routes where the app should minimize instead of navigating back.
   * @type {string[]}
   */
  private routesToMinimize: string[] = [
    '/pre-register',
    '/register',
    '/home',
    '/login',
    '/otp',
    '/app/tabs/register',
  ]; // Rutas donde se minimizará la app

  /**
   * Constructor for AppMinimizeService.
   * Initializes the service with the Angular Router and Ionic Platform.
   * @param {Platform} platform - The Ionic Platform service to handle platform-specific behaviors.
   * @param {Router} router - The Angular Router for navigation and URL management.
   */
  constructor(
    private platform: Platform,
    private router: Router,
  ) {}

  /**
   * Minimizes the app using Capacitor's App API.
   * @returns {void}
   */
  appMinimize(): void {
    void App.minimizeApp();
  }

  /**
   * Determines if the current route matches any of the predefined routes
   * where the app should minimize.
   * @private
   * @param {string} route - The current route URL.
   * @returns {boolean} - True if the app should minimize, false otherwise.
   */
  private shouldMinimizeApp(route: string): boolean {
    // Verifica si la ruta actual está en las rutas configuradas para minimizar
    return this.routesToMinimize.some((configuredRoute) =>
      route.includes(configuredRoute),
    );
  }

  /**
   * Sets up a listener for the hardware back button on Android devices.
   * If the current route is in the `routesToMinimize` list, the app is minimized.
   * Otherwise, navigates back in the browser history.
   * @returns {void}
   */
  initializeBackButtonHandler(): void {
    this.platform.backButton.subscribeWithPriority(10, () => {
      const currentRoute = this.router.url;
      if (this.shouldMinimizeApp(currentRoute)) {
        void this.appMinimize(); // Llama a minimizar directamente
      } else {
        window.history.back(); // Retrocede con Location
      }
    });
  }
}
