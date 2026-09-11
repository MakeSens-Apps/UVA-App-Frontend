import { Injectable } from '@angular/core';
import { SortDirection } from '@aws-amplify/datastore';
import { UserProgressDSService } from '../../storage/datastore/user-progress-ds.service';
import {
  GamificationEventSubtype,
  GamificationEventType,
  GamificationNotification,
} from './gamification-alerts-types.service';
import { GamificationAlertsService } from './gamification-alerts.service';
export {
  GamificationEventSubtype,
  GamificationEventType,
  GamificationNotification,
};

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
   * DEBUG: Reset daily progress for testing (DEVELOPMENT ONLY)
   * @returns {Promise<boolean>}
   */
  static async debugResetDailyProgress(): Promise<boolean> {
    try {
      const userProgress = await this.getLastUserProgress();
      if (userProgress) {
        await this.updateUserProgress(userProgress.id, {
          completedTasks: 0,
        });
        console.log('🧪 DEBUG: Daily progress reset to 0');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error resetting daily progress:', error);
      return false;
    }
  }

  /**
   * DEBUG: Simulate task completion for testing (DEVELOPMENT ONLY)
   * @param {number} taskCount Number of tasks to simulate
   * @param {number} totalTask Total tasks for the day
   * @returns {Promise<boolean>}
   */
  static async debugSimulateTaskCompletion(taskCount: number = 1, totalTask: number = 3): Promise<boolean> {
    try {
      for (let i = 0; i < taskCount; i++) {
        console.log(`🧪 DEBUG: Simulating task ${i + 1} completion...`);
        await this.completeTaskProcess(totalTask);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
      console.log(`🧪 DEBUG: Completed simulation of ${taskCount} tasks`);
      return true;
    } catch (error) {
      console.error('Error simulating task completion:', error);
      return false;
    }
  }

  /**
   * DEBUG: Add seeds directly for testing (DEVELOPMENT ONLY)
   * @param {number} seedAmount Number of seeds to add
   * @returns {Promise<boolean>}
   */
  static async debugAddSeeds(seedAmount: number): Promise<boolean> {
    try {
      const userProgress = await this.getLastUserProgress();
      if (userProgress) {
        const currentSeeds = userProgress.Seed ?? 0;
        await this.updateUserProgress(userProgress.id, {
          Seed: currentSeeds + seedAmount,
        });
        console.log(`🧪 DEBUG: Added ${seedAmount} seeds. Total: ${currentSeeds + seedAmount}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding seeds:', error);
      return false;
    }
  }

  /**
   * DEBUG: Get current user progress for debugging (DEVELOPMENT ONLY)
   * @returns {Promise<void>}
   */
  static async debugShowCurrentProgress(): Promise<void> {
    try {
      const userProgress = await this.getLastUserProgress();
      console.log('🧪 DEBUG: Current User Progress:', {
        completedTasks: userProgress?.completedTasks ?? 0,
        seeds: userProgress?.Seed ?? 0,
        streak: userProgress?.Streak ?? 0,
        date: userProgress?.ts,
      });
    } catch (error) {
      console.error('Error getting current progress:', error);
    }
  }

  /**
   * DEBUG: Run automated test suite (DEVELOPMENT ONLY)
   * @returns {Promise<void>}
   */
  static async debugRunAllTests(): Promise<void> {
    console.log('🧪 Starting automated gamification tests...');

    try {
      // Test 1: First task
      console.log('📋 Test 1: First task completion');
      await this.debugResetDailyProgress();
      await this.debugSimulateTaskCompletion(1, 3);
      let progress = await this.getLastUserProgress();
      const test1Pass = progress?.completedTasks === 1 && (progress?.Seed ?? 0) >= 1;
      console.log(`✅ Test 1 - First task: ${test1Pass ? 'PASSED' : 'FAILED'}`, {
        expected: { completedTasks: 1, seedsMin: 1 },
        actual: { completedTasks: progress?.completedTasks, seeds: progress?.Seed }
      });

      // Test 2: All tasks
      console.log('📋 Test 2: All tasks completion');
      await this.debugResetDailyProgress();
      await this.debugSimulateTaskCompletion(3, 3);
      progress = await this.getLastUserProgress();
      const test2Pass = progress?.completedTasks === 3 && (progress?.Seed ?? 0) >= 2;
      console.log(`✅ Test 2 - All tasks: ${test2Pass ? 'PASSED' : 'FAILED'}`, {
        expected: { completedTasks: 3, seedsMin: 2 },
        actual: { completedTasks: progress?.completedTasks, seeds: progress?.Seed }
      });

      // Test 3: Incremental progress
      console.log('📋 Test 3: Incremental progress');
      await this.debugResetDailyProgress();
      await this.debugSimulateTaskCompletion(1, 3);
      const progress1 = await this.getLastUserProgress();
      await this.debugSimulateTaskCompletion(1, 3);
      const progress2 = await this.getLastUserProgress();
      const test3Pass = (progress2?.completedTasks ?? 0) > (progress1?.completedTasks ?? 0);
      console.log(`✅ Test 3 - Incremental: ${test3Pass ? 'PASSED' : 'FAILED'}`, {
        firstTask: { completedTasks: progress1?.completedTasks, seeds: progress1?.Seed },
        secondTask: { completedTasks: progress2?.completedTasks, seeds: progress2?.Seed }
      });

      console.log('🧪 All automated tests completed');

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  /**
   * DEBUG: Cleanup test data (DEVELOPMENT ONLY)
   * @returns {Promise<void>}
   */
  static async debugCleanup(): Promise<void> {
    try {
      await this.debugResetDailyProgress();
      console.log('🧹 DEBUG: Cleanup completed - daily progress reset');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Update UserProgress with each completed task based on business logic.
   * @param {number} totalTask - Total number of tasks.
   * @returns {Promise<boolean>} Returns true when the function executes correctly.
   */
  static async completeTaskProcess(totalTask: number): Promise<boolean> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Obtener el último progreso del usuario
        const userProgress = await this.getLastUserProgress();
        if (!userProgress?.ts) {
          console.warn('No user progress found, cannot complete task process');
          return false; // No hay datos previos de progreso
        }

        const completedTasks = userProgress.completedTasks ?? 0;
        const seed = userProgress.Seed ?? 0;
        const streak = userProgress.Streak ?? 0;

        // Calcular nuevo estado
        const newCompletedTasks = completedTasks + 1;
        const isFirstTask = completedTasks === 0;
        const isAllTasksComplete = newCompletedTasks >= totalTask;

        // Preparar datos de actualización atómica
        interface UpdateData {
          completedTasks: number;
          Seed?: number;
          Streak?: number;
        }

        const updateData: UpdateData = {
          completedTasks: newCompletedTasks,
        };

        // Configurar lógica de semillas y streak de manera atómica
        if (isFirstTask) {
          // Primera tarea del día: +1 semilla
          updateData.Seed = seed + 1;
          console.log(`First task completed, adding seed. Total seeds: ${seed + 1}`);
        } else if (isAllTasksComplete) {
          // Todas las tareas completadas: +1 semilla y +1 streak
          updateData.Seed = seed + 1;
          updateData.Streak = streak + 1;
          console.log(`All tasks completed (${newCompletedTasks}/${totalTask}), adding seed and streak. Seeds: ${seed + 1}, Streak: ${streak + 1}`);
        }

        // Realizar una sola actualización atómica
        const updatedProgress = await this.updateUserProgress(userProgress.id, updateData);

        if (!updatedProgress) {
          throw new Error('Failed to update user progress - updateUserProgress returned null/undefined');
        }

        // Verificar que la actualización fue exitosa
        const verificationProgress = await this.getLastUserProgress();
        if (!verificationProgress || verificationProgress.completedTasks !== newCompletedTasks) {
          throw new Error(`Update verification failed. Expected completedTasks: ${newCompletedTasks}, got: ${verificationProgress?.completedTasks}`);
        }

        // Procesar alertas después de la actualización exitosa
        try {
          if (isFirstTask) {
            await GamificationAlertsService.createFirstTaskAlert();
          } else if (isAllTasksComplete) {
            await GamificationAlertsService.createAllTasksAlert();

            // Procesar bonus de streak
            await this.streakBonus();

            // Alertas de progreso de streak
            const newStreak = streak + 1;
            if (newStreak % 7 !== 0 && newStreak % 3 === 0) {
              await GamificationAlertsService.createStreakProgressAlert(newStreak);
            }
          }
        } catch (alertError) {
          // No fallar si las alertas fallan, solo loguear
          console.warn('Error creating gamification alerts:', alertError);
        }

        console.log(`Task completion process successful. Tasks: ${newCompletedTasks}/${totalTask}, Seeds: ${updateData.Seed ?? seed}, Streak: ${updateData.Streak ?? streak}`);
        return true; // Proceso completado exitosamente

      } catch (error) {
        retryCount++;
        console.error(`Error en completeTaskProcess (attempt ${retryCount}/${maxRetries}):`, error);

        if (retryCount >= maxRetries) {
          console.error('Max retries reached for completeTaskProcess. Task completion failed.');
          return false;
        }

        // Esperar antes del siguiente intento (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    return false; // Fallback - nunca debería llegar aquí
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
    await GamificationAlertsService.createStreakRecoveredAlert();
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
        await GamificationAlertsService.createStreakRewardAlert(streak);
      }
      return true;
    } catch (error) {
      console.error('Error en streakBonus', error);
      return false;
    }
  }

  /**
   * Retrieves gamification events for notifications.
   * @param {number} limit - Maximum number of notifications to retrieve.
   * @returns {Promise<GamificationNotification[]>} Array of notification objects.
   */
  static async getNotifications(
    limit = 20,
  ): Promise<GamificationNotification[]> {
    return GamificationAlertsService.getNotifications(limit);
  }

  /**
   * Marks a notification as read.
   * @param {string} notificationId - The ID of the notification.
   * @returns {Promise<void>}
   */
  static async markNotificationAsRead(notificationId: string): Promise<void> {
    return GamificationAlertsService.markNotificationAsRead(notificationId);
  }

  /**
   * Deletes all notifications.
   * @returns {Promise<void>}
   */
  static async deleteAllNotifications(): Promise<void> {
    return GamificationAlertsService.deleteAllNotifications();
  }
}
