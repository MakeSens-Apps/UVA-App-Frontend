import { Injectable } from '@angular/core';
import { SortDirection } from '@aws-amplify/datastore';
import { GamificationEventDSService } from '../../storage/datastore/gamification-event-ds.service';
import { UserProgressDSService } from '../../storage/datastore/user-progress-ds.service';

export type GamificationEventType =
  | 'seeds'
  | 'streak'
  | 'achievement'
  | 'surprise'
  | 'bonus'
  | 'first_task_completed'
  | 'all_tasks_completed'
  | 'streak_bonus'
  | 'surprise_reward'
  | 'streak_recovered';

interface GamificationNotification {
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
export class GamificationService extends UserProgressDSService {
  /**
   * Constructor for GamificationService.
   */
  constructor() {
    super();
  }

  /**
   * Update UserProgress with each completed task based on business logic.
   * @param {number} totalTask - Total number of tasks.
   * @returns {Promise<boolean>} Returns true when the function executes correctly.
   */
  static async completeTaskProcess(totalTask: number): Promise<boolean> {
    try {
      // Obtener el último progreso del usuario
      const userProgress = await this.getLastUserProgress();
      if (!userProgress?.ts) {
        return false; // No hay datos previos de progreso
      }

      const completedTasks = userProgress.completedTasks ?? 0;
      const seed = userProgress.Seed ?? 0;
      const streak = userProgress.Streak ?? 0;

      // Día actual: Incrementar tareas completadas
      const newCompletedTasks = completedTasks + 1;

      // Actualizar progreso del usuario con las tareas completadas
      const updatedProgress = await this.updateUserProgress(userProgress.id, {
        completedTasks: newCompletedTasks,
      });

      if (completedTasks === 0) {
        //Primera tarea realizada
        await this.updateUserProgress(userProgress.id, {
          Seed: seed + 1,
        });
        await GamificationEventDSService.createGamificationEvent(
          'first_task_completed',
          JSON.stringify({ seed: seed + 1 }),
        );
      } else if (updatedProgress && newCompletedTasks >= totalTask) {
        // Si se alcanza el número total de tareas, incrementar Seed y Streak
        await this.updateUserProgress(userProgress.id, {
          Seed: seed + 1,
          Streak: streak + 1,
        });
        await GamificationEventDSService.createGamificationEvent(
          'all_tasks_completed',
          JSON.stringify({ seed: seed + 1, streak: streak + 1 }),
        );
        await this.streakBonus();
      }

      return true; // Proceso completado exitosamente
    } catch (error) {
      console.error('Error en completeTaskProcess:', error);
      return false; // Indicar fallo en caso de error
    }
  }

  /**
   * Adds a seed to the user's progress in the last progress entry.
   * @returns {Promise<boolean>} Returns true when the function executes correctly.
   */
  static async surpriseTaskProcess(): Promise<boolean> {
    try {
      // Obtener el último progreso del usuario
      const userProgress = await this.getLastUserProgress();
      if (!userProgress?.ts) {
        return false; // No hay datos previos de progreso
      }

      const seed = userProgress.Seed ?? 0;

      // Actualizar progreso del usuario con las tareas completadas
      await this.updateUserProgress(userProgress.id, {
        Seed: seed + 1,
      });
      return true; // Proceso completado exitosamente
    } catch (error) {
      console.error('Error en surpriseTaskProcess:', error);
      return false; // Indicar fallo en caso de error
    }
  }

  /**
   * Recovers the user's streak by creating or updating progress entries.
   * @returns {Promise<boolean>} Returns true when the function executes correctly.
   */
  static async recoverStreak(): Promise<boolean> {
    const recoverStreakCost = 5;

    // Crear progreso de ayer y mantener semillas del último registro
    const latestProgress = await this.getLastUserProgress();
    if ((latestProgress?.Seed ?? 0) < recoverStreakCost) {
      return false;
    }
    // Obtener progreso de los últimos días
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0]; // Ayer
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000)
      .toISOString()
      .split('T')[0]; // Hace dos días

    const todayProgress = await this.getUserProgress(
      1,
      SortDirection.DESCENDING,
      today,
    );
    const yesterdayProgress = await this.getUserProgress(
      1,
      SortDirection.DESCENDING,
      yesterday,
    );
    const twoDaysAgoProgress = await this.getUserProgress(
      1,
      SortDirection.DESCENDING,
      twoDaysAgo,
    );

    let newStreak: number;
    // Determinar nueva racha basada en el progreso de hace dos días
    if (twoDaysAgoProgress.length > 0) {
      newStreak = (twoDaysAgoProgress[0].Streak ?? 0) + 1;
    } else {
      newStreak = 1;
    }

    const newStreakRegister = {
      Streak: newStreak,
      SaveStreak: true,
      additionalInfo:
        'Salva racha con ' +
        latestProgress?.Seed +
        ' semillas y ' +
        newStreak +
        ' dias de racha.',
    };
    // Manejar progreso del día anterior
    if (yesterdayProgress.length > 0) {
      // Actualizar progreso del día anterior con la nueva racha
      await this.updateUserProgress(yesterdayProgress[0].id, newStreakRegister);
    } else {
      // Si no hay progreso de ayer, crearlo
      const ts = new Date(Date.now() - 86400000).toISOString(); // Timestamp de ayer
      if (todayProgress.length > 0) {
        // Crear progreso de ayer sin monedas (ya hay registro de hoy)
        await this.createUserProgress(newStreakRegister, ts);
      } else {
        await this.createUserProgress(
          {
            ...newStreakRegister,
            Seed: latestProgress?.Seed,
          },
          ts,
        );
      }
    }

    // Actualizar la racha del día actual si ya existe progreso
    const newSeed = (latestProgress?.Seed ?? 0) - 5;

    if (todayProgress.length > 0) {
      await this.updateUserProgress(todayProgress[0].id, {
        Streak: newStreak + (latestProgress?.Streak ?? 0),
        Seed: newSeed,
      });
    }
    await GamificationEventDSService.createGamificationEvent(
      'streak_recovered',
      JSON.stringify({ newStreak, cost: recoverStreakCost }),
    );
    return true;
  }

  /**
   * Adds a bonus seed to the user's progress if the streak is a multiple of the bonus interval.
   * @returns {Promise<boolean>} Returns true when the function executes correctly.
   */
  private static async streakBonus(): Promise<boolean> {
    const daysForStreak = 7;
    const bonusSeedForStreak = 3;
    try {
      const userProgress = await this.getLastUserProgress();
      if (!userProgress?.ts) {
        return false; // No hay datos previos de progreso
      }
      const streak = userProgress.Streak ?? 0;
      const seed = userProgress.Seed ?? 0;
      //Valida bonus por racha
      if (streak % daysForStreak === 0) {
        // Actualizar progreso del usuario con las tareas completadas
        await this.updateUserProgress(userProgress.id, {
          Seed: seed + bonusSeedForStreak,
        });
        await GamificationEventDSService.createGamificationEvent(
          'streak_bonus',
          JSON.stringify({ bonusSeeds: bonusSeedForStreak, streak }),
        );
      }
      return true;
    } catch (error) {
      console.error('Error en streakBonus', error);
      return false;
    }
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
        return {
          id: event.id,
          data: {
            title: this.getEventTitle(event.eventType as GamificationEventType),
            description: this.getEventDescription(
              event.eventType as GamificationEventType,
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
   * Gets the title for an event type.
   * @param {GamificationEventType} eventType - The event type.
   * @returns {string} The title.
   */
  private static getEventTitle(eventType: GamificationEventType): string {
    const titles: Record<GamificationEventType, string> = {
      seeds: 'Semillas',
      streak: 'Racha',
      achievement: 'Logro',
      surprise: 'Sorpresa',
      bonus: 'Bono',
      first_task_completed: 'Primera tarea completada',
      all_tasks_completed: 'Todas las tareas completadas',
      streak_bonus: 'Bono de racha',
      surprise_reward: '¡Recompensa sorpresa!',
      streak_recovered: 'Racha recuperada',
    };
    return titles[eventType] || 'Notificación';
  }

  /**
   * Gets the description for an event type.
   * @param {GamificationEventType} eventType - The event type.
   * @param {string} data - The event data.
   * @returns {string} The description.
   */
  private static getEventDescription(
    eventType: GamificationEventType,
    data: string,
  ): string {
    try {
      const parsedData = JSON.parse(data);
      switch (eventType) {
        case 'first_task_completed':
          return `Completaste tu primera tarea del día. Has ganado ${parsedData.seed || 10} semillas.`;
        case 'all_tasks_completed':
          return `Completaste todas las tareas del día. ¡Excelente trabajo! +${parsedData.seed || 25} semillas.`;
        case 'streak_bonus':
          return `Por mantener tu racha de ${parsedData.streak || 7} días, has recibido ${parsedData.bonusSeeds || 3} semillas de bonificación.`;
        case 'surprise_reward':
          return `Has ganado ${parsedData.seed || 50} semillas extras por tu dedicación. ¡Sigue así!`;
        case 'streak_recovered':
          return `Has usado ${parsedData.cost || 20} semillas para recuperar tu racha. ¡No pierdas el ritmo!`;
        case 'seeds':
          return `Has recibido semillas.`;
        case 'streak':
          return `Has mantenido tu racha.`;
        case 'achievement':
          return `Has logrado un hito.`;
        case 'surprise':
          return `¡Sorpresa!`;
        case 'bonus':
          return `Has recibido un bono.`;
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
