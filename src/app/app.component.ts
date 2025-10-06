import { Component } from '@angular/core';
import { AppMinimizeService } from '@app/core/services/minimize/app-minimize.service';
import { DataStore, syncExpression } from '@aws-amplify/datastore';
import { IonApp, IonRouterOutlet, Platform } from '@ionic/angular/standalone';
import { configureAutoTrack } from 'aws-amplify/analytics';
import { GamificationEvent } from 'src/models';
import { ConfigurationAppService } from './core/services/storage/configuration-app.service';
import { SyncMonitorDSService } from './core/services/storage/datastore/sync-monitor-ds.service';
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
   * @param {Platform} platform -For Wait for the platform to load
   * @param {AppMinimizeService} appMinimizeService - For initialize listener of the back button and can minimize app.
   */
  constructor(
    private configuration: ConfigurationAppService,
    private platform: Platform,
    private appMinimizeService: AppMinimizeService,
  ) {
    // Configure DataStore sync expressions
    DataStore.configure({
      syncExpressions: [
        syncExpression(GamificationEvent, () => {
          return (ge) => ge.isUnclean.eq(true);
        }),
      ],
    });

    void this.configuration.loadBranding();
    platform
      .ready()
      .then(() => {
        SyncMonitorDSService.subscribeToSync();
        appMinimizeService.initializeBackButtonHandler();
      })
      .catch((err) => {
        console.error(err);
      });
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
