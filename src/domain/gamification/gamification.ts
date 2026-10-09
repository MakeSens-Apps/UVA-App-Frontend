/**
 * B07 — GamificationService (domain/gamification)
 * Ported from: src/app/core/services/view/gamification/gamification.service.ts
 * Classification: Major adaptation
 *
 * Changes from original (per portability-matrix §4.1 / §4.4):
 *   - Removed @Injectable / class hierarchy: extends UserProgressDSService → COMPOSITION
 *     (GamificationService now imports UserProgressDSService methods directly)
 *   - Removed all DEBUG methods (debugResetDailyProgress, debugSimulateTaskCompletion,
 *     debugAddSeeds, debugShowCurrentProgress, debugRunAllTests, debugCleanup)
 *     — per plan.md B07: "excluir DEBUG"
 *   - getLastUserProgress() calls are now getLastUserProgressPure() (read-only getter, R-28)
 *     except inside recalculateDailyProgress() which owns the side-effect path.
 *   - All static methods are preserved (portability-matrix §4.1 allows static pattern)
 *   - Re-exports gamification types for consumers (plan.md B07 re-export contract)
 *   - No Angular / React imports — pure domain module
 *
 * WARNING: Never call getLastUserProgressPure() more than once per interaction to avoid
 * stale-read race conditions in concurrent callers. The idempotent daily recalculation
 * lives in UserProgressDSService.recalculateDailyProgress().
 *
 * PRESERVED: streak constants (daysForStreak=7, bonusSeedForStreak=3, recoverStreakCost=5)
 *            backoff: maxRetries=3, delay=1000*retryCount ms (plan.md B07 gate)
 */

import { SortDirection } from '@aws-amplify/datastore';
import { UserProgressDSService } from '@/data/datastore/user-progress-ds';
import { GamificationAlertsService } from './gamification-alerts';
import {
  GamificationEventSubtype,
  GamificationEventType,
  GamificationNotification,
} from './gamification-alerts-types';

export {
  GamificationEventSubtype,
  GamificationEventType,
  GamificationNotification,
};

/**
 * GamificationService — pure domain logic for seeds, streaks, bonuses, and notifications.
 * Uses UserProgressDSService via composition (not inheritance).
 */
export class GamificationService {
  // ─── Task Completion ────────────────────────────────────────────────────────

  /**
   * Update UserProgress with each completed task based on business logic.
   * Retries up to 3 times with exponential backoff on failure.
   *
   * Business rules:
   *   - First task of the day: +1 seed
   *   - All tasks complete (newCompletedTasks >= totalTask): +1 seed, +1 streak
   *   - Creates streak alerts when streak is multiple of 3 (not 7)
   *   - Triggers streakBonus every 7 days
   *
   * @param {number} totalTask - Total number of tasks.
   * @returns {Promise<boolean>} Returns true when the function executes correctly.
   */
  static async completeTaskProcess(totalTask: number): Promise<boolean> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const userProgress =
          await UserProgressDSService.getLastUserProgressPure();
        if (!userProgress?.ts) {
          console.warn('No user progress found, cannot complete task process');
          return false;
        }

        const completedTasks = userProgress.completedTasks ?? 0;
        const seed = userProgress.Seed ?? 0;
        const streak = userProgress.Streak ?? 0;

        const newCompletedTasks = completedTasks + 1;
        const isFirstTask = completedTasks === 0;
        const isAllTasksComplete = newCompletedTasks >= totalTask;

        interface UpdateData {
          completedTasks: number;
          Seed?: number;
          Streak?: number;
        }

        const updateData: UpdateData = { completedTasks: newCompletedTasks };

        if (isFirstTask) {
          updateData.Seed = seed + 1;
        } else if (isAllTasksComplete) {
          updateData.Seed = seed + 1;
          updateData.Streak = streak + 1;
        }

        const updatedProgress = await UserProgressDSService.updateUserProgress(
          userProgress.id,
          updateData,
        );

        if (!updatedProgress) {
          throw new Error(
            'Failed to update user progress - updateUserProgress returned null/undefined',
          );
        }

        const verificationProgress =
          await UserProgressDSService.getLastUserProgressPure();
        if (
          !verificationProgress ||
          verificationProgress.completedTasks !== newCompletedTasks
        ) {
          throw new Error(
            `Update verification failed. Expected completedTasks: ${newCompletedTasks}, got: ${verificationProgress?.completedTasks}`,
          );
        }

        try {
          if (isFirstTask) {
            await GamificationAlertsService.createFirstTaskAlert();
          } else if (isAllTasksComplete) {
            await GamificationAlertsService.createAllTasksAlert();
            await this.streakBonus();
            const newStreak = streak + 1;
            if (newStreak % 7 !== 0 && newStreak % 3 === 0) {
              await GamificationAlertsService.createStreakProgressAlert(
                newStreak,
              );
            }
          }
        } catch (alertError) {
          console.warn('Error creating gamification alerts:', alertError);
        }

        return true;
      } catch (error) {
        retryCount++;
        console.error(
          `Error en completeTaskProcess (attempt ${retryCount}/${maxRetries}):`,
          error,
        );

        if (retryCount >= maxRetries) {
          console.error(
            'Max retries reached for completeTaskProcess. Task completion failed.',
          );
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    return false;
  }

  // ─── Surprise Task ───────────────────────────────────────────────────────────

  /**
   * Adds a seed to the user's progress in the last progress entry.
   * @returns {Promise<boolean>} Returns true when the function executes correctly.
   */
  static async surpriseTaskProcess(): Promise<boolean> {
    try {
      const userProgress =
        await UserProgressDSService.getLastUserProgressPure();
      if (!userProgress?.ts) {
        return false;
      }

      const seed = userProgress.Seed ?? 0;

      await UserProgressDSService.updateUserProgress(userProgress.id, {
        Seed: seed + 1,
      });
      return true;
    } catch (error) {
      console.error('Error en surpriseTaskProcess:', error);
      return false;
    }
  }

  // ─── Streak Recovery ─────────────────────────────────────────────────────────

  /**
   * Recovers the user's streak by creating or updating progress entries.
   * Cost: 5 seeds (recoverStreakCost).
   * @returns {Promise<boolean>} Returns true when the function executes correctly.
   */
  static async recoverStreak(): Promise<boolean> {
    const recoverStreakCost = 5;

    const latestProgress =
      await UserProgressDSService.getLastUserProgressPure();
    if ((latestProgress?.Seed ?? 0) < recoverStreakCost) {
      return false;
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0];
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000)
      .toISOString()
      .split('T')[0];

    const todayProgress = await UserProgressDSService.getUserProgress(
      1,
      SortDirection.DESCENDING,
      today,
    );
    const yesterdayProgress = await UserProgressDSService.getUserProgress(
      1,
      SortDirection.DESCENDING,
      yesterday,
    );
    const twoDaysAgoProgress = await UserProgressDSService.getUserProgress(
      1,
      SortDirection.DESCENDING,
      twoDaysAgo,
    );

    let newStreak: number;
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

    if (yesterdayProgress.length > 0) {
      await UserProgressDSService.updateUserProgress(
        yesterdayProgress[0].id,
        newStreakRegister,
      );
    } else {
      const ts = new Date(Date.now() - 86400000).toISOString();
      if (todayProgress.length > 0) {
        await UserProgressDSService.createUserProgress(newStreakRegister, ts);
      } else {
        await UserProgressDSService.createUserProgress(
          {
            ...newStreakRegister,
            Seed: latestProgress?.Seed,
          },
          ts,
        );
      }
    }

    const newSeed = (latestProgress?.Seed ?? 0) - 5;

    if (todayProgress.length > 0) {
      await UserProgressDSService.updateUserProgress(todayProgress[0].id, {
        Streak: newStreak + (latestProgress?.Streak ?? 0),
        Seed: newSeed,
      });
    }

    await GamificationAlertsService.createStreakRecoveredAlert();
    return true;
  }

  // ─── Notifications (delegate to alerts) ─────────────────────────────────────

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

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Adds a bonus seed to the user's progress if the streak is a multiple of 7.
   * Bonus: 3 seeds for every 7-day streak milestone.
   * @private
   * @returns {Promise<boolean>}
   */
  private static async streakBonus(): Promise<boolean> {
    const daysForStreak = 7;
    const bonusSeedForStreak = 3;
    try {
      const userProgress =
        await UserProgressDSService.getLastUserProgressPure();
      if (!userProgress?.ts) {
        return false;
      }
      const streak = userProgress.Streak ?? 0;
      const seed = userProgress.Seed ?? 0;

      if (streak % daysForStreak === 0) {
        await UserProgressDSService.updateUserProgress(userProgress.id, {
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
}
