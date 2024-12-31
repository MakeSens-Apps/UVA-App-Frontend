import { Injectable } from '@angular/core';
import { UserProgressDSService } from '../../storage/datastore/user-progress-ds.service';

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
  //********************************************************* */
  /*
  static async processBonusSeedsForStreak(
    totalTasks = 1,
  ): Promise<UserProgress | undefined> {
    const progress = await this.getUserProgress(1);
    if (!progress || progress.length < 1) {
      return;
    }
    const currentDate = new Date();
    const lastProgressDate = new Date(progress[0].ts);
    const daysDifference = this.calculateDaysDifference(
      lastProgressDate,
      currentDate,
    );
    if (daysDifference != 0) {
      return;
    }

    if (
      (progress[0].Streak ?? 0) % 7 &&
      totalTasks <= (progress[0].completedTasks ?? 0)
    ) {
      return await DataStore.save(
        //Suma 3 seeds
        UserProgress.copyOf(progress[0], (updated) => {
          updated.Seed = updated.Seed ?? 0 + 3;
        }),
      );
    }
  }
  static async processLoseStreak(): Promise<UserProgress | undefined> {
    const progress = await this.getUserProgress(1);
    if (!progress || progress.length < 1) {
      return;
    }
    const currentDate = new Date();
    const lastProgressDate = new Date(progress[0].ts);
    const daysDifference = this.calculateDaysDifference(
      lastProgressDate,
      currentDate,
    );
    if (daysDifference === 0) {
      return;
    }
    if (daysDifference >= 2) {
      return await this.createUserProgress({
        Seed: progress[0].Seed,
        Streak: 0,
        completedTasks: 0,
      });
    }
    if (daysDifference === 1 && progress[0].completedTasks) {
      
    }
  }

  private static async processStreak(): Promise<UserProgress | undefined> {
    const progress = await this.getUserProgress(1);
    if (!progress || progress.length < 1) {
      return;
    }
    //evalua la fecha del ultimo userprogress
    //si es anterior a hoy
    //si es anterior a mas de 2 dias entonces reininicia streacks en 0 en nuevo user progress y finaliza
    //Determina si debe crear un nuevo userprogress con streaks en 0
    //determinar si debe adicionar semillas por racha.
    if (totalTasks > (progress[0].completedTasks ?? 0)) {
    }
  }

  static async getLastTTTUserProgress(): Promise<UserProgress | null> {
    // A. Obtener último registro
    const lastProgress = await this.getUserProgress(
      1,
      SortDirection.DESCENDING,
    );

    // B. Si no hay registros previos, retornar null
    if (!lastProgress.length) {
      return null;
    }

    // C. Procesar progreso del usuario
    const processedProgress = await this.processUserProgress(lastProgress[0]);

    return processedProgress;
  }

  private static async processUserProgress(
    lastProgress: UserProgress,
  ): Promise<UserProgress> {
    const currentDate = new Date();
    const lastProgressDate = new Date(lastProgress.ts);

    // Calcular días de diferencia
    const daysDifference = this.calculateDaysDifference(
      lastProgressDate,
      currentDate,
    );

    // Gestión de streak
    if (daysDifference == 1) {
      if (lastProgress.SaveStreak && (lastProgress.Seed ?? 0) >= 5) {
        // Salvaguardar streak si cumple condiciones
        await this.updateUserProgress(lastProgress, {
          Seed: (lastProgress.Seed ?? 0) - 5,
          SaveStreak: false,
        });
        await this.logStreakEvent(
          'Streak salvado por inactividad de 1 día',
          lastProgress,
        );
      } else {
        // Reiniciar streak y registrar pérdida
        await this.updateUserProgress(lastProgress, { Streak: 0 });
        await this.logStreakEvent(
          'Streak perdido por inactividad',
          lastProgress,
        );
      }
    } else if (lastProgress.completedTasks === 0) {
      await this.updateUserProgress(lastProgress, { Streak: 0 });
      await this.logStreakEvent(
        'Streak perdido por no completar tareas',
        lastProgress,
      );
    }

    // Procesar milestones y transición de mes/año
    await this.processMonthlyMilestones(
      lastProgressDate,
      currentDate,
      lastProgress,
    );

    // Crear nuevo registro de progreso para hoy
    return await this.createNewUserProgress(lastProgress, currentDate);
  }

  private static async processMonthlyMilestones(
    startDate: Date,
    endDate: Date,
    lastProgress: UserProgress,
  ): Promise<void> {
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const milestone = this.calculateMilestone(lastProgress.Seed ?? 0);

      if (milestone) {
        // Crear registro con el milestone
        await this.createMilestoneProgress(
          currentDate,
          milestone,
          lastProgress,
        );

        if (milestone === 'flor') {
          await this.updateUserProgress(lastProgress, { Seed: 0 }); // Reiniciar seeds
        }
      }

      // Avanzar al siguiente mes
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  private static calculateMilestone(seeds: number): string | null {
    if (seeds >= 65) {
      return 'flor';
    }
    if (seeds > 40) {
      return 'plantula';
    }
    if (seeds > 10) {
      return 'brote';
    }
    return null;
  }

  private static async createMilestoneProgress(
    date: Date,
    milestone: string,
    lastProgress: UserProgress,
  ): Promise<void> {
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    await this.createNewUserProgress(lastProgress, lastDayOfMonth, milestone);
  }

  private static async logStreakEvent(
    reason: string,
    lastProgress: UserProgress,
  ): Promise<void> {
    // Registrar evento de streak
    await this.createNewUserProgress(
      lastProgress,
      new Date(),
      undefined,
      `Evento de streak: ${reason}`,
    );
  }

  private static async createNewUserProgress(
    lastProgress: UserProgress,
    date: Date,
    milestone?: string,
    additionalInfo?: string,
  ): Promise<UserProgress> {
    const newProgress = {
      ts: date.toISOString(),
      Seed: lastProgress.Seed,
      Streak: lastProgress.Streak,
      Milestones: milestone || lastProgress.Milestones,
      SaveStreak: false,
      completedTasks: 0,
      userID: lastProgress.userID,
      additionalInfo,
    };

    // Crear un nuevo registro en DataStore
    return await DataStore.save(new UserProgress(newProgress));
  }

  private static calculateDaysDifference(
    startDate: Date,
    endDate: Date,
  ): number {
    // Clonar las fechas para evitar modificar los objetos originales
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Establecer las horas, minutos, segundos y milisegundos a 0
    // para comparar solo las fechas
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Calcular la diferencia en milisegundos
    const timeDifference = end.getTime() - start.getTime();

    // Convertir milisegundos a días
    const daysDifference = Math.floor(timeDifference / (1000 * 3600 * 24));

    // Retornar el número de días entre las fechas
    // Si es el mismo día, retornará 0
    // Si es el día siguiente, retornará 1, y así sucesivamente
    return daysDifference;
  }*/
}
