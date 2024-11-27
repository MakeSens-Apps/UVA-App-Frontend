import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonButtons,
  IonButton,
  IonCard,
  IonItem,
  IonToggle,
  IonLabel,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonSpinner,
  LoadingController,
  IonModal,
  IonFooter,
  IonList,
  IonInput,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { ToastController } from '@ionic/angular'; // La importación de ToastController permanece desde @ionic/angular
import { SyncActionComponent } from '@app/pages/profile/configuration/sync-action/sync-action.component';
import { SyncMonitorDSService } from '@app/core/services/storage/datastore/sync-monitor-ds.service';
import { DataStore } from '@aws-amplify/datastore';
import { MoonPhaseService } from '@app/core/services/view/moon/moon-phase.service';

/**
 * @class ConfigurationPage
 * @description A page component that allows users to configure settings such as notifications and data management.
 */
@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.page.html',
  styleUrls: ['./configuration.page.scss'],
  standalone: true,
  imports: [
    IonCardTitle,
    IonCardHeader,
    IonCardContent,
    IonLabel,
    IonToggle,
    IonItem,
    IonCard,
    IonButton,
    IonButtons,
    IonIcon,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonSpinner,
    IonModal,
    IonFooter,
    IonList,
    IonInput,
    SyncActionComponent,
  ],
})
export class ConfigurationPage {
  isConfigurationAppAvailible = false;
  isDataStoreSyncPending = false;
  isNotificationsActive = false;
  isLoading = false;
  /**
   *  @param {Router} router - Angular Router instance used for navigation.
   *  @param {ConfigurationAppService} config The service handling application configuration and data download.
     *  @param {MoonPhaseService} moonphase The service from moon Phase
 
  *  @param {ToastController} toastController Manage Alerts
   *  @param {LoadingController} loadingController Manage loading
   *  @param {SyncMonitorDSService} dsStateService Sync data service
   */
  constructor(
    private router: Router,
    private config: ConfigurationAppService,
    private moonphase: MoonPhaseService,
    private toastController: ToastController,
    private loadingController: LoadingController, // Añadimos el LoadingController
    private dsStateService: SyncMonitorDSService,
  ) {}

  /**
   * view about to enter
   */
  ionViewWillEnter(): void {
    this.isDataStoreSyncPending = !this.dsStateService.synchronizedData();
    this.isConfigurationAppAvailible = SyncMonitorDSService.networkStatus;
  }

  /**
   * Navigates back to the specified URL.
   * @param {string} url - The URL to navigate back to.
   * @returns {void}
   */
  goBack(url: string): void {
    void this.router.navigate([url]);
  }

  /**
   * Activates or deactivates notifications based on user input.
   * @param {Event} event - The event object containing the toggle state.
   * @returns {void}
   */
  activeNoti(event: Event): void {
    this.isNotificationsActive = (event as CustomEvent).detail.checked;
    // eslint-disable-next-line no-console
    console.debug('Notificaciones activadas:', this.isNotificationsActive);
  }
  /**
   * Uploads data based on user configurations.
   * @returns {void}
   */
  syncData(): void {
    if (SyncMonitorDSService.networkStatus) {
      void DataStore.start();
    } else {
      void this.presentErrorToast(
        'Necesita internet para ejecutar esta accion',
      );
    }
  }

  /**
   * Synchronizes data based on user configurations.
   * @returns {void}
   */
  async updateConfiguration(): Promise<void> {
    const loading = await this.loadingController.create({
      message: 'Cargando...',
      spinner: 'circles',
      backdropDismiss: false,
    });

    await loading.present();

    try {
      const downloadSuccessPromise = this.config.downLoadData();
      const downloadMoonPhasesPromise =
        this.moonphase.downloadAndStoreMoonPhaseData();

      const [downloadSuccess, downloadMoonPhases] = await Promise.all([
        downloadSuccessPromise,
        downloadMoonPhasesPromise,
      ]);

      if (downloadSuccess && downloadMoonPhases) {
        await this.config.loadBranding();
      } else {
        await this.presentErrorToast(
          'Hubo un error al descargar los datos los datos.',
        );
      }
    } catch (error) {
      await this.presentErrorToast('Hubo un error al descargar los datos.');
    } finally {
      this.isLoading = false;
      await loading.dismiss();
    }
  }

  /**
   * Displays a toast message for errors.
   * @param {string} message - The error message to display.
   * @returns {Promise<void>} - Resolves when the toast is presented.
   */
  async presentErrorToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'danger',
    });
    await toast.present();
  }
}
