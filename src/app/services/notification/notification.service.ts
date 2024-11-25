import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  constructor() {}

  /**
   * Solicitar permisos para notificaciones locales
   */
  async requestPermissions(): Promise<boolean> {
    const permission = await LocalNotifications.requestPermissions();
    return permission.display === 'granted';
  }

  /**
   * Programar notificaciones diarias en horarios específicos
   */
  async scheduleDailyNotifications(morningTimeHour = 6,afternoonTimeHour = 18): Promise<void> {
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
      console.log('Notificaciones programadas para las 6:00 AM y 4:00 PM.');
    } catch (error) {
      console.error('Error al programar notificaciones diarias:', error);
    }
  }

  /**
   * Cancelar todas las notificaciones programadas
   */
  async cancelAllNotifications(): Promise<void> {
    await LocalNotifications.removeAllListeners();
    console.warn('Todas las notificaciones han sido canceladas.');
  }
}
