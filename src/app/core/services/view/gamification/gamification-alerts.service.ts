import { Injectable } from '@angular/core';
import { SortDirection } from '@aws-amplify/datastore';
import { GamificationEvent } from 'src/models';
import { GamificationEventDSService } from '../../storage/datastore/gamification-event-ds.service';
import {
  EventData,
  eventMessages,
  GamificationEventSubtype,
  GamificationEventType,
  GamificationNotification,
  validateEventData,
} from './gamification-alerts-types.service';

/**
 *
 * @param subtype
 */
function getRandomMessageIndex(subtype: GamificationEventSubtype): number {
  return Math.floor(Math.random() * eventMessages[subtype].length) + 1;
}

@Injectable({
  providedIn: 'root',
})
export class GamificationAlertsService {
  /**
   * Creates a first task completed alert.
   * @param {Date | undefined} ts Date of the event.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createFirstTaskAlert(
    ts?: Date,
  ): Promise<GamificationEvent | undefined> {
    const data: EventData = {
      subtype: 'first_task',
      isUnread: true,
      messageIndex: getRandomMessageIndex('first_task'),
    };
    return GamificationEventDSService.createGamificationEvent(
      'seeds',
      JSON.stringify(data),
      undefined,
      ts?.toISOString(),
    );
  }

  /**
   * Creates an all tasks completed alert.
   * @param {Date | undefined} ts Date of the event.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createAllTasksAlert(
    ts?: Date,
  ): Promise<GamificationEvent | undefined> {
    const data: EventData = {
      subtype: 'all_tasks',
      isUnread: true,
      messageIndex: getRandomMessageIndex('all_tasks'),
    };
    return GamificationEventDSService.createGamificationEvent(
      'seeds',
      JSON.stringify(data),
      undefined,
      ts?.toISOString(),
    );
  }

  /**
   * Creates a streak reward alert.
   * @param {number} days - Number of days in streak.
   * @param {Date | undefined} ts Date of the event.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createStreakRewardAlert(
    days: number,
    ts?: Date,
  ): Promise<GamificationEvent | undefined> {
    const data: EventData = {
      subtype: 'streak_reward',
      days,
      isUnread: true,
      messageIndex: getRandomMessageIndex('streak_reward'),
    };
    return GamificationEventDSService.createGamificationEvent(
      'streak',
      JSON.stringify(data),
      undefined,
      ts?.toISOString(),
    );
  }

  /**
   * Creates a germination success alert.
   * @param {string} stage - The germination stage.
   * @param {Date | undefined} ts Date of the event.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createGerminationSuccessAlert(
    stage: string,
    ts?: Date,
  ): Promise<GamificationEvent | undefined> {
    const data: EventData = {
      subtype: 'germination_success',
      stage,
      isUnread: true,
      messageIndex: getRandomMessageIndex('germination_success'),
    };
    return GamificationEventDSService.createGamificationEvent(
      'achievement',
      JSON.stringify(data),
      undefined,
      ts?.toISOString(),
    );
  }

  /**
   * Creates a germination fail alert.
   * @param {Date | undefined} ts Date of the event.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createGerminationFailAlert(
    ts?: Date,
  ): Promise<GamificationEvent | undefined> {
    const data: EventData = {
      subtype: 'germination_fail',
      isUnread: true,
      messageIndex: getRandomMessageIndex('germination_fail'),
    };
    return GamificationEventDSService.createGamificationEvent(
      'achievement',
      JSON.stringify(data),
      undefined,
      ts?.toISOString(),
    );
  }

  /**
   * Creates a streak recovery alert.
   * @param {Date | undefined} ts Date of the event.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createStreakRecoveryAlert(
    ts?: Date,
  ): Promise<GamificationEvent | undefined> {
    const data: EventData = {
      subtype: 'streak_recovery',
      isUnread: true,
      messageIndex: getRandomMessageIndex('streak_recovery'),
    };
    return GamificationEventDSService.createGamificationEvent(
      'streak',
      JSON.stringify(data),
      undefined,
      ts?.toISOString(),
    );
  }

  /**
   * Creates a streak lost alert.
   * @param {Date | undefined} ts Date of the event.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createStreakLostAlert(
    ts?: Date,
  ): Promise<GamificationEvent | undefined> {
    const data: EventData = {
      subtype: 'streak_lost',
      isUnread: true,
      messageIndex: getRandomMessageIndex('streak_lost'),
    };
    return GamificationEventDSService.createGamificationEvent(
      'streak',
      JSON.stringify(data),
      undefined,
      ts?.toISOString(),
    );
  }

  /**
   * Creates a streak progress alert.
   * @param {number} days - Number of days in streak.
   * @param {Date | undefined} ts Date of the event.
   * @returns {Promise<GamificationEvent | undefined>} The created event.
   */
  static async createStreakProgressAlert(
    days: number,
    ts?: Date,
  ): Promise<GamificationEvent | undefined> {
    const data: EventData = {
      subtype: 'streak_progress',
      days,
      isUnread: true,
      messageIndex: getRandomMessageIndex('streak_progress'),
    };
    return GamificationEventDSService.createGamificationEvent(
      'streak',
      JSON.stringify(data),
      undefined,
      ts?.toISOString(),
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
        if (validateEventData(parsedData)) {
          const eventData = parsedData;
          return {
            id: event.id,
            data: {
              title: this.getEventTitle(
                event.eventType as GamificationEventType,
                eventData.subtype,
              ),
              description: this.getEventDescription(
                event.eventType as GamificationEventType,
                eventData.subtype,
                typeof event.data === 'string'
                  ? event.data
                  : JSON.stringify(event.data),
              ),
              isUnread: eventData.isUnread,
            },
            isUnclean: event.isUnclean ?? false,
            timestamp: this.formatTimestamp(event.ts),
            type: event.eventType as GamificationEventType,
            subtype: eventData.subtype,
          };
        } else {
          // Fallback for invalid data
          return {
            id: event.id,
            data: {
              title: 'Notificación',
              description: 'Has recibido una notificación de gamificación.',
              isUnread: false,
            },
            isUnclean: event.isUnclean ?? false,
            timestamp: this.formatTimestamp(event.ts),
            type: event.eventType as GamificationEventType,
          };
        }
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
      streak_reward: 'Recompensa por racha activa',
      germination_success: 'Germinación exitosa',
      germination_fail: 'No hubo germinación',
      streak_recovery: 'Recupera tu racha',
      streak_lost: 'Has perdido tu racha',
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
      const messageIndex = parsedData.messageIndex - 1; // 0-based
      let message =
        eventMessages[subtype][messageIndex] || eventMessages[subtype][0];
      if (parsedData.days !== undefined) {
        message = message.replace(/{days}/g, parsedData.days.toString());
      }
      if (parsedData.stage !== undefined) {
        message = message.replace(/{stage}/g, parsedData.stage);
      }
      return message;
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

  /**
   * Marks a notification as read by updating its data.
   * @param {string} notificationId - The ID of the notification.
   * @returns {Promise<void>}
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const events = await GamificationEventDSService.getGamificationEvents();
      const event = events.find((e) => e.id === notificationId);
      if (!event) {
        return;
      }

      let parsedData: Record<string, unknown> = {};
      if (event.data) {
        if (typeof event.data === 'string') {
          parsedData = JSON.parse(event.data);
        } else if (typeof event.data === 'object') {
          parsedData = event.data;
        }
      }
      const newParsedData = { ...parsedData, isUnread: false };
      const newData = JSON.stringify(newParsedData);
      await GamificationEventDSService.updateGamificationEventData(
        notificationId,
        newData,
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Deletes all notifications by marking them as clean.
   * @returns {Promise<void>}
   */
  static async deleteAllNotifications(): Promise<void> {
    await GamificationEventDSService.markAllAsClean();
  }
}
