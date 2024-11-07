import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SessionService } from '@app/core/services/session/session.service';
import { HeaderComponent } from '@app/components/header/header.component';

import { SetupService } from '@app/core/services/view/setup/setup.service';
import { Session } from 'src/models/session.model';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
@Component({
  selector: 'app-measurement',
  templateUrl: 'measurement.page.html',
  styleUrls: ['measurement.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, HeaderComponent],
})
export class MeasurementPage implements OnInit {
  user: Session | null = null;
  /**
   * Creates an instance of MeasurementPage.
   * @param {Router} router Redireccion a otras vistas
   * @param {SessionService} session Servicio para manejar datos en cache del usuario
   * @param {SetupService} service  Servicio para manejar las funcionalidades del flujo de setup del usuario
   * @param {ConfigurationAppService} configuration Servicio para obtener datos de configuracion en filestore
   * @memberof MeasurementPage
   */
  constructor(
    private router: Router,
    private session: SessionService,
    private service: SetupService,
    private configuration: ConfigurationAppService,
  ) {}

  /**
   *
   * @returns {Promise<void>}
   * @memberof MeasurementPage
   */
  async ngOnInit(): Promise<void> {
    this.user = await this.session.getInfo();
    await this.configuration.getConfigurationApp();
    await this.configuration.getConfigurationMeasurement();
    await this.configuration.getConfigurationColors();

    await this.configuration.loadBranding();
  }

  /**
   *
   * @returns {Promise<void>}
   * @memberof MeasurementPage
   */
  async close(): Promise<void> {
    const response = await this.service.signOut();
    if (response) {
      this.session.clearSession();
      await this.router.navigate([''], {
        replaceUrl: true,
      });
    }
  }
  /**
   * Downloads and loads configuration and branding data asynchronously.
   * @async
   * @returns {Promise<void>} - A promise that resolves once the data download and branding load are complete.
   * @description This function triggers the downloading of configuration data by calling `downLoadData`
   * and then applies branding settings by calling `loadBranding` from the `configuration` service.
   */
  async DownloadData(): Promise<void> {
    await this.configuration.downLoadData();
    await this.configuration.loadBranding();
  }
}
