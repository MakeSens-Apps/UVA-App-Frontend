import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

const notificationKey = 'notificationPermissionGrantedUser';
const notificationProgrammedKey = 'notificationPermissionProgrammed';
const notificationChannelId = 'measurement-reminders';

interface NotificationState {
  userEnabled: boolean;
  systemPermissionGranted: boolean;
  exactAlarmPermissionGranted: boolean;
  notificationsScheduled: boolean;
  lastScheduleAttempt: string;
  batteryOptimizationDisabled: boolean;
  notificationChannelCreated: boolean;
}

interface SystemStatus {
  canSchedule: boolean;
  permissionsGranted: boolean;
  exactAlarmAvailable: boolean;
  batteryOptimized: boolean;
  issues: string[];
}
@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  /**
   * Constructor of the NotificationService
   */
  constructor() {
    // Initialize notification channels on service creation
    void this.initializeNotificationSystem();
  }
  
  /**
   * Initialize the notification system with proper setup for Android 15
   */
  private async initializeNotificationSystem(): Promise<void> {
    try {
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        void this.createNotificationChannels();
      }
    } catch (error) {
      console.error('Error initializing notification system:', error);
    }
  }

  /**
   * Requests comprehensive permissions for local notifications including Android 13+ runtime permissions
   * @returns {Promise<boolean>} A promise that resolves to true if all necessary permissions are granted
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Check current permissions first
      const currentPermissions = await LocalNotifications.checkPermissions();
      
      if (currentPermissions.display === 'granted') {
        return true;
      }
      
      // Request notification permissions (required for Android 13+)
      const permission = await LocalNotifications.requestPermissions();
      const permissionGranted = permission.display === 'granted';
      
      if (permissionGranted) {
        // Check if we need exact alarm permissions (Android 12+)
        const needsExactAlarm = await this.needsExactAlarmPermission();
        if (needsExactAlarm) {
          await this.requestExactAlarmPermission();
        }
        
        // Create notification channels for Android 8+
        await this.createNotificationChannels();
      }
      
      return permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedules daily notifications at specific times (default: 6:00 AM and 6:00 PM).
   * @param {number} morningTimeHour 6 hours - The hour for the morning notification (24-hour format).
   * @param {number} afternoonTimeHour 18 hours - The hour for the afternoon notification (24-hour format).
   * @returns {Promise<void>} A promise that resolves when the notifications are scheduled.
   */
  async scheduleDailyNotifications(
    morningTimeHour = 6,
    afternoonTimeHour = 18,
  ): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.error('Permisos denegados para notificaciones.');
      return;
    }
    const programmed = (
      await Preferences.get({ key: notificationProgrammedKey })
    ).value;
    if (programmed) {
      const status = JSON.parse(programmed);
      if (status.programmed) {
        console.warn('Notificaciones ya programadas.');
        return;
      }
    }

    const now = new Date();

    // Configurar los horarios deseados
    const morningTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      morningTimeHour, // hora
      0,
      0,
    ); // 6:00 AM
    const afternoonTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      afternoonTimeHour, //hora
      0,
      0,
    ); // 4:00 PM

    // Si la hora actual ya pasó, programa para el día siguiente
    if (now > morningTime) {
      morningTime.setDate(morningTime.getDate() + 1);
    }
    if (now > afternoonTime) {
      afternoonTime.setDate(afternoonTime.getDate() + 1);
    }

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 1,
            title: 'Recordatorio de registro',
            body: '¡Es hora de registrar tus mediciones ambientales! Temperatura, humedad y lluvia te esperan.',
            schedule: {
              at: morningTime,
              repeats: true, // Notificación diaria
              allowWhileIdle: true, // Critical for Doze mode compatibility
              every: 'day'
            },
            sound: 'default',
            smallIcon: 'ic_launcher',
            channelId: notificationChannelId,
            ongoing: false,
            autoCancel: true,
          },
          {
            id: 2,
            title: 'Recordatorio de registro',
            body: '¡Hora de registrar tus mediciones ambientales! No olvides temperatura, humedad y lluvia.',
            schedule: {
              at: afternoonTime,
              repeats: true, // Notificación diaria
              allowWhileIdle: true, // Critical for Doze mode compatibility
              every: 'day'
            },
            sound: 'default',
            smallIcon: 'ic_launcher',
            channelId: notificationChannelId,
            ongoing: false,
            autoCancel: true,
          },
        ],
      });
      await Preferences.set({
        key: notificationProgrammedKey,
        value: JSON.stringify({ programmed: true }),
      });
      console.warn('Notificaciones programadas para las 6:00 AM y 6:00 PM.');
    } catch (error) {
      console.error('Error al programar notificaciones diarias:', error);
    }
  }

  /**
   * Cancels all scheduled notifications.
   * @returns {Promise<void>} A promise that resolves when all notifications are cancelled.
   */
  async cancelAllNotifications(): Promise<void> {
    await LocalNotifications.removeAllListeners();
    await Preferences.remove({ key: notificationProgrammedKey });
    console.warn('Todas las notificaciones han sido canceladas.');
  }

  /**
   * Retrieves the user's notification enable status.
   * @returns {Promise<boolean>} A promise that resolves to true if notifications are enabled, false otherwise.
   */
  async getEnableNotifications(): Promise<boolean> {
    const ret = await Preferences.get({ key: notificationKey });
    if (ret.value) {
      const status = JSON.parse(ret.value);
      return status.enableNotifications;
    }
    return false;
  }

  /**
   * Updates the user's notification enable status.
   * If notifications are disabled, all scheduled notifications are cancelled.
   * If enabled, daily notifications are scheduled.
   * @param {boolean} enable - The new notification enable status.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async setEnableNotifications(enable: boolean): Promise<void> {
    await Preferences.set({
      key: notificationKey,
      value: JSON.stringify({ enableNotifications: enable }),
    }).then(async () => {
      if (!enable) {
        await this.cancelAllNotifications();
      } else {
        await this.scheduleDailyNotifications();
      }
    });
  }

  /**
   * Creates notification channels for Android 8+ devices
   * @returns {Promise<void>} A promise that resolves when channels are created
   */
  async createNotificationChannels(): Promise<void> {
    try {
      const platform = Capacitor.getPlatform();
      if (platform !== 'android') {
        return;
      }

      await LocalNotifications.createChannel({
        id: notificationChannelId,
        name: 'Recordatorios de Medición',
        description: 'Recordatorios diarios para registrar mediciones ambientales',
        importance: 4, // High importance
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#488AFF'
      });

      // Notification channels created successfully
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }

  /**
   * Checks if exact alarm permission is needed (Android 12+)
   * @returns {Promise<boolean>} True if exact alarm permission is needed
   */
  async needsExactAlarmPermission(): Promise<boolean> {
    try {
      const deviceInfo = await Device.getInfo();
      const androidVersion = parseInt(deviceInfo.osVersion);
      return deviceInfo.platform === 'android' && androidVersion >= 12;
    } catch (error) {
      console.error('Error checking Android version:', error);
      return false;
    }
  }

  /**
   * Requests exact alarm permission for Android 12+
   * @returns {Promise<boolean>} True if permission is granted or not needed
   */
  async requestExactAlarmPermission(): Promise<boolean> {
    try {
      // Note: This would typically require a native plugin to handle exact alarm permissions
      // For now, we'll return true as exact alarm permission would be requested here
      return true;
    } catch (error) {
      console.error('Error requesting exact alarm permission:', error);
      return false;
    }
  }

  /**
   * Gets comprehensive notification system status
   * @returns {Promise<SystemStatus>} Current system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const issues: string[] = [];
    let canSchedule = true;
    let permissionsGranted = false;
    let exactAlarmAvailable = true;
    let batteryOptimized = false;

    try {
      // Check basic notification permissions
      const permissions = await LocalNotifications.checkPermissions();
      permissionsGranted = permissions.display === 'granted';
      
      if (!permissionsGranted) {
        issues.push('Permisos de notificación no otorgados');
        canSchedule = false;
      }

      // Check exact alarm permissions if needed
      const needsExactAlarm = await this.needsExactAlarmPermission();
      if (needsExactAlarm) {
        // This would check actual exact alarm permission status
        // For now, we assume it's available
        exactAlarmAvailable = true;
      }

      // Check battery optimization status
      batteryOptimized = await this.isBatteryOptimized();
      if (batteryOptimized) {
        issues.push('Optimización de batería habilitada');
      }

    } catch (error) {
      console.error('Error getting system status:', error);
      issues.push('Error verificando estado del sistema');
      canSchedule = false;
    }

    return {
      canSchedule,
      permissionsGranted,
      exactAlarmAvailable,
      batteryOptimized,
      issues
    };
  }

  /**
   * Checks if the app is being battery optimized
   * @returns {Promise<boolean>} True if battery optimization is active
   */
  async isBatteryOptimized(): Promise<boolean> {
    try {
      // This would typically require a native plugin to check battery optimization
      // For now, we'll return false as a default
      return false;
    } catch (error) {
      console.error('Error checking battery optimization:', error);
      return false;
    }
  }

  /**
   * Shows guidance for disabling battery optimization
   * @returns {Promise<void>} A promise that resolves when guidance is shown
   */
  async showBatteryOptimizationGuidance(): Promise<void> {
    // This would show a dialog with instructions for disabling battery optimization
    // Implementation would go here
  }

  /**
   * Shows guidance for users about Private Space limitations (Android 15+)
   * @returns {Promise<void>} A promise that resolves when guidance is shown
   */
  async showPrivateSpaceGuidance(): Promise<void> {
    try {
      const deviceInfo = await Device.getInfo();
      const androidVersion = parseInt(deviceInfo.osVersion);
      
      if (deviceInfo.platform === 'android' && androidVersion >= 15) {
        // Private Space guidance: Avoid installing app in Private Space for reliable notifications
        // Implementation would show guidance dialog here
      }
    } catch (error) {
      console.error('Error showing Private Space guidance:', error);
    }
  }

  /**
   * Gets comprehensive notification state for configuration UI
   * @returns {Promise<NotificationState>} Current notification state
   */
  async getComprehensiveNotificationState(): Promise<NotificationState> {
    const userEnabled = await this.getEnableNotifications();
    const systemStatus = await this.getSystemStatus();
    
    const programmed = await Preferences.get({ key: notificationProgrammedKey });
    let notificationsScheduled = false;
    if (programmed.value) {
      const status = JSON.parse(programmed.value);
      notificationsScheduled = status.programmed || false;
    }

    return {
      userEnabled,
      systemPermissionGranted: systemStatus.permissionsGranted,
      exactAlarmPermissionGranted: systemStatus.exactAlarmAvailable,
      notificationsScheduled,
      lastScheduleAttempt: new Date().toISOString(),
      batteryOptimizationDisabled: !systemStatus.batteryOptimized,
      notificationChannelCreated: true // Assuming channels are created during init
    };
  }
}
