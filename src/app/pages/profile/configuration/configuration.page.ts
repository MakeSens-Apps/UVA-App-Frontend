import { NotificationService } from './../../../services/notification/notification.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { App } from '@capacitor/app';
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
  IonBadge,
  IonText,
  IonNote,
  IonChip,
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
    IonBadge,
    IonText,
    IonNote,
    IonChip,
    SyncActionComponent,
  ],
})
export class ConfigurationPage {
  isConfigurationAppAvailible = false;
  isDataStoreSyncPending = false;
  isNotificationsActive = false;
  isLoading = false;
  private appStateListener: any;
  
  // Enhanced notification status properties
  notificationSystemStatus: {
    canSchedule: boolean;
    permissionsGranted: boolean;
    exactAlarmAvailable: boolean;
    batteryOptimized: boolean;
    issues: string[];
  } = {
    canSchedule: false,
    permissionsGranted: false,
    exactAlarmAvailable: false,
    batteryOptimized: false,
    issues: []
  };
  notificationState: {
    userEnabled: boolean;
    systemPermissionGranted: boolean;
    notificationsScheduled: boolean;
  } = {
    userEnabled: false,
    systemPermissionGranted: false,
    notificationsScheduled: false
  };
  showNotificationDetails = false;
  /**
   *  @param {Router} router - Angular Router instance used for navigation.
   *  @param {ConfigurationAppService} config The service handling application configuration and data download.
   *  @param {MoonPhaseService} moonphase The service from moon Phase
   *  @param {ToastController} toastController Manage Alerts
   *  @param {LoadingController} loadingController Manage loading
   *  @param {SyncMonitorDSService} dsStateService Sync data service
   *  @param {NotificationService} notificationService handler notifications
   */
  constructor(
    private router: Router,
    private config: ConfigurationAppService,
    private moonphase: MoonPhaseService,
    private toastController: ToastController,
    private loadingController: LoadingController, // Añadimos el LoadingController
    private dsStateService: SyncMonitorDSService,
    private notificationService: NotificationService,
  ) {}

  /**
   * view about to enter
   */
  ionViewWillEnter(): void {
    this.isDataStoreSyncPending = !this.dsStateService.synchronizedData();
    this.isConfigurationAppAvailible = SyncMonitorDSService.networkStatus;

    // Load comprehensive notification status
    this.loadNotificationStatus();
    
    // Listen for app state changes to refresh status when returning from settings
    this.setupAppStateListener();
  }
  
  /**
   * Sets up listener for app state changes to refresh notification status
   * when user returns from system settings
   */
  private setupAppStateListener(): void {
    // Remove existing listener if any
    if (this.appStateListener) {
      this.appStateListener.remove();
    }
    
    this.appStateListener = App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        // App became active again, refresh notification status
        setTimeout(() => {
          void this.loadNotificationStatus();
        }, 500); // Small delay to ensure system state is updated
      }
    });
  }
  
  /**
   * Cleanup when leaving the page
   */
  ionViewWillLeave(): void {
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
  }
  
  /**
   * Loads comprehensive notification status including system permissions and settings
   * @returns {Promise<void>}
   */
  async loadNotificationStatus(): Promise<void> {
    try {
      // Get basic user setting
      const isEnabled = await this.notificationService.getEnableNotifications();
      this.isNotificationsActive = isEnabled;
      
      // Get comprehensive system status
      this.notificationSystemStatus = await this.notificationService.getSystemStatus();
      
      // Get detailed notification state
      this.notificationState = await this.notificationService.getComprehensiveNotificationState();
      
      // Show Private Space guidance for Android 15+
      void this.notificationService.showPrivateSpaceGuidance();
      
    } catch (err) {
      console.error('Error al obtener el estado de notificaciones:', err);
      await this.presentErrorToast('Error al verificar estado de notificaciones');
    }
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
  async activeNoti(event: Event): Promise<void> {
    const checked = (event as CustomEvent).detail.checked;
    
    if (checked) {
      // Check if system permissions are available before enabling
      const hasPermissions = await this.notificationService.requestPermissions();
      
      if (!hasPermissions) {
        // Revert toggle state if permissions denied
        this.isNotificationsActive = false;
        await this.presentErrorToast('Permisos de notificación requeridos. Ve a Configuración de la app para habilitarlos.');
        return;
      }
    }
    
    this.isNotificationsActive = checked;
    
    try {
      await this.notificationService.setEnableNotifications(this.isNotificationsActive);
      
      // Reload status after change
      await this.loadNotificationStatus();
      
      const message = this.isNotificationsActive 
        ? 'Notificaciones habilitadas correctamente'
        : 'Notificaciones deshabilitadas';
      
      void this.presentSuccessToast(message);
      
    } catch (err) {
      console.error('Error al cambiar notificaciones:', err);
      // Revert toggle state on error
      this.isNotificationsActive = !this.isNotificationsActive;
      await this.presentErrorToast('Error al cambiar configuración de notificaciones');
    }
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
      duration: 3000,
      color: 'danger',
    });
    await toast.present();
  }
  
  /**
   * Displays a toast message for success.
   * @param {string} message - The success message to display.
   * @returns {Promise<void>} - Resolves when the toast is presented.
   */
  async presentSuccessToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: 'success',
    });
    await toast.present();
  }
  
  /**
   * Toggles the visibility of notification details
   * @returns {void}
   */
  toggleNotificationDetails(): void {
    this.showNotificationDetails = !this.showNotificationDetails;
  }
  
  /**
   * Requests notification permissions manually
   * @returns {Promise<void>}
   */
  async requestNotificationPermissions(): Promise<void> {
    try {
      const granted = await this.notificationService.requestPermissions();
      
      if (granted) {
        await this.presentSuccessToast('Permisos de notificación otorgados');
        await this.loadNotificationStatus();
      } else {
        // On mobile, the user might be redirected to settings
        await this.presentErrorToast('Permisos de notificación requeridos. Si no aparece el diálogo, ve a Configuración del sistema.');
        
        // For devices where native dialog doesn't appear, try to refresh after a delay
        setTimeout(() => {
          void this.loadNotificationStatus();
        }, 2000);
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      await this.presentErrorToast('Error al solicitar permisos de notificación');
    }
  }
  
  /**
   * Shows battery optimization guidance
   * @returns {Promise<void>}
   */
  async showBatteryOptimizationGuidance(): Promise<void> {
    await this.notificationService.showBatteryOptimizationGuidance();
  }
  
  /**
   * Gets status color for notification state using UVA design system
   * @returns {string} Color name for ion components
   */
  getNotificationStatusColor(): string {
    if (!this.notificationSystemStatus.permissionsGranted) {
      return 'danger'; // Uses system danger color #E5245E
    }
    if (this.notificationSystemStatus.batteryOptimized) {
      return 'uva_orange-500'; // Orange for warnings #E58B24
    }
    if (this.notificationSystemStatus.canSchedule) {
      return 'uva_green-500'; // Green for success #69AB3C
    }
    return 'medium'; // Default medium gray
  }
  
  /**
   * Gets status text for notification state
   * @returns {string} Status description
   */
  getNotificationStatusText(): string {
    if (!this.notificationSystemStatus.permissionsGranted) {
      return 'Permisos requeridos';
    }
    if (this.notificationSystemStatus.batteryOptimized) {
      return 'Optimización de batería activa';
    }
    if (this.notificationSystemStatus.canSchedule) {
      return 'Funcionando correctamente';
    }
    return 'Estado desconocido';
  }
}
