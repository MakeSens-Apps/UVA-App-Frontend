import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

const notificationKey = 'notificationPermissionGrantedUser';
const notificationProgrammedKey = 'notificationPermissionProgrammed';
@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  /**
   * Constructor of the NotificationService
   */
  constructor() {}

  /**
   * Requests permissions for local notifications.
   * @returns {Promise<boolean>} A promise that resolves to true if the notification permission is granted, false otherwise.
   */
  async requestPermissions(): Promise<boolean> {
    const permission = await LocalNotifications.requestPermissions();
    return permission.display === 'granted';
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
            body: '¡Es hora de registrar tus mediciones en UVA! Que esperas ya están habilitadas.',
            schedule: {
              at: morningTime,
              repeats: true, // Notificación diaria
            },
            sound: 'default',
            smallIcon: 'ic_launcher',
          },
          {
            id: 2,
            title: 'Recordatorio de registro',
            body: 'Es hora de registrar tus mediciones en UVA! Que esperas ya están habilitadas.',
            schedule: {
              at: afternoonTime,
              repeats: true, // Notificación diaria
            },
            sound: 'default',
            smallIcon: 'ic_launcher',
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
}
