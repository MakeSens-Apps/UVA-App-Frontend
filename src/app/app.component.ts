import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ConfigurationAppService } from './core/services/storage/configuration-app.service';
import { SyncMonitorDSService } from './core/services/storage/datastore/sync-monitor-ds.service';
import { Platform } from '@ionic/angular/standalone';
import { Hub } from 'aws-amplify/utils';
import { DataStore } from '@aws-amplify/datastore';
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
  constructor(
    private configuration: ConfigurationAppService,
    private platform: Platform,
  ) {
    void this.configuration.loadBranding();
    platform
      .ready()
      .then(() => {
        SyncMonitorDSService.subscribeToSync();
      })
      .catch((err) => {
        console.error(err);
      });
  }
}
