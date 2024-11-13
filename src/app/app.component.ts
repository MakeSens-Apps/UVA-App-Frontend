import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { ConfigurationAppService } from './core/services/storage/configuration-app.service';
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
  }
}
