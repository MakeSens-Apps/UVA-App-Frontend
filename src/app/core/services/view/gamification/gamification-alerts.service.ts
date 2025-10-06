import { Injectable } from '@angular/core';
import { SortDirection } from '@aws-amplify/datastore';
import { GamificationEvent } from 'src/models';
import { GamificationEventDSService } from '../../storage/datastore/gamification-event-ds.service';

export type GamificationEventType =
  | 'seeds'
  | 'streak'
  | 'achievement'
  | 'bonus';

export type GamificationEventSubtype =
  | 'first_task'
  | 'all_tasks'
  | 'streak_reward'
  | 'germination'
  | 'failed_germination'
  | 'streak_recovery'
  | 'streak_lost'
  | 'streak_progress';

export interface GamificationNotification {
  id: string;
  data: {
    title: string;
    description: string;
    isUnread: boolean;
  };
  isUnclean: boolean;
  timestamp: string;
  type?: GamificationEventType;
}

@Injectable({
  providedIn: 'root',
})
export class GamificationAlertsService {
  /**
   * Creates a first task completed alert.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createFirstTaskAlert(): Promise<GamificationEvent | undefined> {
    return GamificationEventDSService.createGamificationEvent(
      'seeds',
      JSON.stringify({ subtype: 'first_task', isUnread: true }),
    );
  }

  /**
   * Creates an all tasks completed alert.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createAllTasksAlert(): Promise<GamificationEvent | undefined> {
    return GamificationEventDSService.createGamificationEvent(
      'seeds',
      JSON.stringify({ subtype: 'all_tasks', isUnread: true }),
    );
  }

  /**
   * Creates a streak reward alert.
   * @param {number} days - Number of days in streak.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createStreakRewardAlert(
    days: number,
  ): Promise<GamificationEvent | undefined> {
    return GamificationEventDSService.createGamificationEvent(
      'streak',
      JSON.stringify({ subtype: 'streak_reward', days, isUnread: true }),
    );
  }

  /**
   * Creates a germination alert.
   * @param {string} stage - The germination stage.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createGerminationAlert(
    stage: string,
  ): Promise<GamificationEvent | undefined> {
    return GamificationEventDSService.createGamificationEvent(
      'achievement',
      JSON.stringify({ subtype: 'germination', stage, isUnread: true }),
    );
  }

  /**
   * Creates a failed germination alert.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createFailedGerminationAlert(): Promise<
    GamificationEvent | undefined
  > {
    return GamificationEventDSService.createGamificationEvent(
      'seeds',
      JSON.stringify({ subtype: 'failed_germination', isUnread: true }),
    );
  }

  /**
   * Creates a streak recovery alert.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createStreakRecoveryAlert(): Promise<
    GamificationEvent | undefined
  > {
    return GamificationEventDSService.createGamificationEvent(
      'bonus',
      JSON.stringify({ subtype: 'streak_recovery', isUnread: true }),
    );
  }

  /**
   * Creates a streak lost alert.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createStreakLostAlert(): Promise<GamificationEvent | undefined> {
    return GamificationEventDSService.createGamificationEvent(
      'streak',
      JSON.stringify({ subtype: 'streak_lost', isUnread: true }),
    );
  }

  /**
   * Creates a streak progress alert.
   * @param {number} days - Number of days in streak.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createStreakProgressAlert(
    days: number,
  ): Promise<GamificationEvent | undefined> {
    return GamificationEventDSService.createGamificationEvent(
      'streak',
      JSON.stringify({ subtype: 'streak_progress', days, isUnread: true }),
    );
  }
  /**
   * Retrieves gamification events for notifications (mock data for testing).
   * @param {number} limit - Maximum number of notifications to retrieve.
   * @returns {Promise<GamificationNotification[]>} Array of notification objects.
   */
  static async getNotifications(
    limit = 20,
  ): Promise<GamificationNotification[]> {
    try {
      const events = await GamificationEventDSService.getGamificationEvents(
        limit,
        SortDirection.DESCENDING,
      );
      return events.map((event) => {
        let parsedData: Record<string, unknown> = {};
        if (event.data) {
          if (typeof event.data === 'string') {
            try {
              parsedData = JSON.parse(event.data);
            } catch {
              parsedData = {};
            }
          } else if (typeof event.data === 'object') {
            parsedData = event.data;
          }
        }
        const subtype = parsedData['subtype'] as GamificationEventSubtype;
        return {
          id: event.id,
          data: {
            title: this.getEventTitle(
              event.eventType as GamificationEventType,
              subtype,
            ),
            description: this.getEventDescription(
              event.eventType as GamificationEventType,
              subtype,
              typeof event.data === 'string'
                ? event.data
                : JSON.stringify(event.data),
            ),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            isUnread: (parsedData as any).isUnread ?? false,
          },
          isUnclean: event.isUnclean ?? false,
          timestamp: this.formatTimestamp(event.ts),
          type: event.eventType as GamificationEventType,
        };
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Gets the title for an event type and subtype.
   * @param {GamificationEventType} type - The event type.
   * @param {GamificationEventSubtype} subtype - The event subtype.
   * @returns {string} The title.
   */
  private static getEventTitle(
    type: GamificationEventType,
    subtype: GamificationEventSubtype,
  ): string {
    const titles: Record<GamificationEventSubtype, string> = {
      first_task: 'Primera tarea completada',
      all_tasks: 'Todas las tareas completadas',
      streak_reward: 'Racha mantenida',
      germination: '¡Tus semillas han germinado!',
      failed_germination: 'Tus semillas no germinaron',
      streak_recovery: 'Recupera tu racha',
      streak_lost: 'Racha perdida',
      streak_progress: 'Racha en progreso',
    };
    return titles[subtype] || 'Notificación';
  }

  /**
   * Gets the description for an event type and subtype.
   * @param {GamificationEventType} type - The event type.
   * @param {GamificationEventSubtype} subtype - The event subtype.
   * @param {string} data - The event data.
   * @returns {string} The description.
   */
  private static getEventDescription(
    type: GamificationEventType,
    subtype: GamificationEventSubtype,
    data: string,
  ): string {
    try {
      const parsedData = JSON.parse(data);
      switch (subtype) {
        case 'first_task':
          return 'Acabas de completar tu primera tarea del día y has ganado una semilla 🌱';
        case 'all_tasks':
          return 'Has completado todas tus tareas del día y has ganado una semilla extra 🌾';
        case 'streak_reward':
          return `¡Llevas ${parsedData.days || 7} días de racha! Acabas de ganar tres semillas como recompensa`;
        case 'germination':
          return `Tus semillas han germinado y se han convertido en una ${parsedData.stage || 'brote'}`;
        case 'failed_germination':
          return 'Tus semillas eran muy pocas y no lograron germinar 🌧️. ¡Sigue intentando!';
        case 'streak_recovery':
          return 'Ayer perdiste tu racha, pero aún puedes recuperarla 🌻. ¡Recupérala aquí!';
        case 'streak_lost':
          return 'Has perdido tu racha 💨';
        case 'streak_progress':
          return `Llevas ${parsedData.days || 5} días de racha 🌞. ¡Sigue así! En dos días podrías ganar tres semillas más`;
        default:
          return 'Has recibido una notificación de gamificación.';
      }
    } catch {
      return 'Has recibido una notificación de gamificación.';
    }
  }

  /**
   * Formats a timestamp for display.
   * @param {string} timestamp - The timestamp.
   * @returns {string} Formatted timestamp.
   */
  private static formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();

    // Normalizamos ambas fechas a medianoche (00:00:00)
    const dateAtMidnight = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const nowAtMidnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    // Calculamos la diferencia en días de calendario
    const diffDays = Math.round(
      (nowAtMidnight.getTime() - dateAtMidnight.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    if (diffDays === 0) {
      return `Hoy • ${hours}:${minutes}`;
    } else if (diffDays === 1) {
      return `Ayer • ${hours}:${minutes}`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días • ${hours}:${minutes}`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  }
}
