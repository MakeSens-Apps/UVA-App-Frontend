import { Injectable } from '@angular/core';
import { UserProgressDSService } from '../../storage/datastore/user-progress-ds.service';
import { SortDirection } from '@aws-amplify/datastore';

@Injectable({
  providedIn: 'root',
})
export class GamificationService extends UserProgressDSService {
  /**
   *
   */

  constructor() {
    super();
  }

  /**
   * Update UserProgress with each completed task based on business logic
   * @param {number} totalTask - total task
   * @returns {Promise<boolean>} Returns true when the correctly function execute
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
      } else if (updatedProgress && newCompletedTasks >= totalTask) {
        // Si se alcanza el número total de tareas, incrementar Seed y Streak
        await this.updateUserProgress(userProgress.id, {
          Seed: seed + 1,
          Streak: streak + 1,
        });
        await this.streakBonus();
      }

      return true; // Proceso completado exitosamente
    } catch (error) {
      console.error('Error en completeTaskProcess:', error);
      return false; // Indicar fallo en caso de error
    }
  }

  /**
   * Este task adiciona un seed al progreso del usuario, en el lastprogress
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
    return true;
  }

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
      }
      return true;
    } catch (error) {
      console.error('Error en streakBonus', error);
      return false;
    }
  }
}
