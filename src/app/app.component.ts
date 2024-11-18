import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ConfigurationAppService } from './core/services/storage/configuration-app.service';
import { configureAutoTrack } from 'aws-amplify/analytics';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  /**
   * Creates an instance of AppComponent.
   * @memberof AppComponent
   * @param {ConfigurationAppService} configuration Configuretion Service to load branding/Colors
   */
  constructor(private configuration: ConfigurationAppService) {
    void this.configuration.loadBranding();
    this.initAutoTrack();
  }

  /**
   * Configure track analitics
   * @memberof AppComponent
   */
  private initAutoTrack(): void {
    configureAutoTrack({
      enable: true,
      type: 'session',
      options: {
        attributes: {
          customizableField: 'attr',
        },
      },
    });
    configureAutoTrack({
      enable: true,
      type: 'pageView',
      options: {
        attributes: {
          customizableField: 'attr',
        },

        eventName: 'pageView',
        appType: 'singlePage',

        urlProvider: () => {
          return window.location.origin + window.location.pathname;
        },
      },
    });
  }
}
