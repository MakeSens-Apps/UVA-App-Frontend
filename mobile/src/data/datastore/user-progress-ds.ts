/**
 * B07 — UserProgressDSService (B07 split: read-pure vs side-effects)
 * Ported from: src/app/core/services/storage/datastore/user-progress-ds.service.ts
 * Classification: Major adaptation
 *
 * B07 changes (per portability-matrix §4.4 / R-28):
 *   - Added getLastUserProgressPure(): pure read-only getter with ZERO side-effects.
 *     Safe to call from React hooks / useFocusEffect / StrictMode without duplication.
 *   - Added recalculateDailyProgress(): idempotent daily update that creates/updates
 *     UserProgress records and emits alerts. Called ONCE per day from app init or
 *     the screen that bootstraps the session, NOT from multiple hook calls.
 *   - getLastUserProgress() is KEPT for backward-compatibility but now delegates
 *     to recalculateDailyProgress() + getLastUserProgressPure(). Callers should
 *     prefer the split API.
 *
 * PRESERVED: umbrales hardcodeados 11/41/64 (seedToMilestone) per portability-matrix §4.4.
 * Diverge from ConfigModel.gamification — documented deuda; do not silently unify.
 *
 * Static methods preserved (portability-matrix §4.1 — static pattern allowed).
 */

import { DataStore, Predicates, SortDirection } from '@aws-amplify/datastore';
import { UserProgress } from '@/data/models';
import SessionService from '@/data/session/session';
import { GamificationAlertsService } from '@/domain/gamification/gamification-alerts';

// Re-export SortDirection so callers do not need to import from @aws-amplify/datastore directly
// (direct import triggers async-storage module loading in Jest test environments).
export { SortDirection } from '@aws-amplify/datastore';

export interface CompletedTask {
  daysComplete: number[];
  daysIncomplete: number[];
  daysSaveStreak: number[];
}
type UserProgressFields = Partial<Omit<UserProgress, 'id' | 'ts' | 'userID'>>;

/**
 * Service for managing UserProgress data.
 */
export class UserProgressDSService {
  static session = new SessionService();

  /**
   * Adds a new UserProgress entry.
   * @param {UserProgressFields} userData - User data.
   * @param {string} ts - Date of user progress.
   * @returns {Promise<UserProgress>} The newly created UserProgress.
   */
  static async createUserProgress(
    userData: UserProgressFields,
    ts?: string,
  ): Promise<UserProgress | undefined> {
    try {
      const userID = (await this.session.getInfo()).userID ?? '';

      const newUserProgress = await DataStore.save(
        new UserProgress({
          ts: ts ? ts : new Date().toISOString(),
          Seed: userData.Seed ?? null,
          Streak: userData.Streak ?? null,
          Milestones: userData.Milestones ?? null,
          SaveStreak: userData.SaveStreak ?? null,
          completedTasks: userData.completedTasks ?? null,
          additionalInfo: userData.additionalInfo ?? null,
          userID: userID,
        }),
      );
      return newUserProgress;
    } catch (error) {
      console.error('Error creating UserProgress:', error);
      throw error;
    }
  }

  /**
   * Update a UserProgress entry by id.
   * @param {string} id - ID of the UserProgress entry.
   * @param {UserProgressFields} updatedFields - Updated fields.
   * @returns {Promise<UserProgress | undefined>} The updated UserProgress.
   */
  static async updateUserProgress(
    id: string,
    updatedFields: UserProgressFields,
  ): Promise<UserProgress | undefined> {
    try {
      const userProgress = await DataStore.query(UserProgress, id);
      if (!userProgress) {
        console.error('UserProgress not found');
        return undefined;
      }

      const updatedUserProgress = await DataStore.save(
        UserProgress.copyOf(userProgress, (updated) => {
          Object.assign(updated, updatedFields);
        }),
      );
      return updatedUserProgress;
    } catch (error) {
      console.error('Error updating UserProgress:', error);
      throw error;
    }
  }

  /**
   * Retrieves all progress entries for a specific user or progress for a specific date if provided.
   * @param {number} limit - Maximum number of entries to retrieve.
   * @param {SortDirection} sortDirection - Sorting direction: SortDirection.ASCENDING or SortDirection.DESCENDING.
   * @param {string} date - Optional date in the format "YYYY-MM-DD" to filter the progress entries.
   * @returns {Promise<UserProgress[]>} List of UserProgress entries.
   * @throws Will throw an error if the `date` is not in the expected format.
   */
  static async getUserProgress(
    limit = 1,
    sortDirection: SortDirection = SortDirection.DESCENDING,
    date?: string,
  ): Promise<UserProgress[]> {
    try {
      let response: UserProgress[];
      if (date) {
        response = await DataStore.query(
          UserProgress,
          (c) => c.ts.contains(date),
          {
            sort: (up) => up.ts(sortDirection),
            limit,
          },
        );
      } else {
        response = await DataStore.query(UserProgress, Predicates.ALL, {
          sort: (up) => up.ts(sortDirection),
          limit,
        });
      }
      return response;
    } catch (error) {
      console.error('Error fetching UserProgress', error);
      throw error;
    }
  }

  /**
   * B07 — Pure read-only getter: returns the most recent UserProgress record without
   * creating any new records or emitting any alerts. Safe to call multiple times from
   * React hooks, useFocusEffect, StrictMode, etc.
   *
   * Returns:
   *   - The last UserProgress entry if one exists
   *   - null if no records exist yet
   *
   * @returns {Promise<UserProgress | null>} The last UserProgress entry.
   */
  static async getLastUserProgressPure(): Promise<
    UserProgress | undefined | null
  > {
    const lastsProgress = await this.getUserProgress(
      1,
      SortDirection.DESCENDING,
    );
    if (!lastsProgress.length) {
      return null;
    }
    return lastsProgress[0];
  }

  /**
   * B07 — Idempotent daily recalculation: checks whether a new day has started since
   * the last UserProgress record and, if so, creates the appropriate record and emits
   * the correct alerts (streak maintenance, reset, or recovery prompt).
   *
   * This method MUST be called at most once per app session (e.g., in the startup hook
   * or splash logic), NOT inside useFocusEffect / component renders.
   *
   * Business rules (preserved from original getLastUserProgress):
   *   - Same day (diff=0): no-op, returns existing record
   *   - One day ago (diff=1): creates new progress row, emits streakRecovery alert
   *     if completedTasks===0 and previous streak>0
   *   - More than one day (diff>1): resets streak to 0, emits streakLost alert
   *   - Also handles milestone assignment (seeds→brote/plantula/flor) at month boundary
   *
   * @returns {Promise<UserProgress | null>} The current day's UserProgress entry.
   */
  static async recalculateDailyProgress(): Promise<
    UserProgress | undefined | null
  > {
    const lastsProgress = await this.getUserProgress(
      1,
      SortDirection.DESCENDING,
    );

    if (!lastsProgress.length) {
      return null;
    }

    const lastProgress = lastsProgress[0];
    const currentDate = new Date();
    const lastProgressDate = new Date(lastProgress.ts);
    const daysDifference = this.calculateDaysDifference(
      lastProgressDate,
      currentDate,
    );
    const newSeed = await this.handleMilestoneAssignment(lastProgress);

    if (daysDifference === 0) {
      return lastProgress;
    } else if (daysDifference === 1) {
      const newUserProgress = await this.createUserProgress({
        completedTasks: 0,
        Seed: newSeed,
        Streak:
          lastProgress.completedTasks === 0 ? 0 : (lastProgress.Streak ?? 0),
      });
      if (
        lastProgress.completedTasks === 0 &&
        (lastProgress.Streak ?? 0) > 0
      ) {
        await GamificationAlertsService.createStreakRecoveryAlert();
      }
      return newUserProgress;
    } else {
      const resetProgress = await this.createUserProgress({
        completedTasks: 0,
        Seed: newSeed,
        Streak: 0,
      });
      await GamificationAlertsService.createStreakLostAlert();
      return resetProgress;
    }
  }

  /**
   * Retrieves the last progress entry for a specific user.
   *
   * ⚠️  DEPRECATED in favour of the split API (B07/R-28):
   *   - For read-only access use: getLastUserProgressPure()
   *   - To trigger daily recalculation use: recalculateDailyProgress()
   *
   * This method is kept for backward-compatibility. New callers MUST use the split API.
   * It now internally delegates to recalculateDailyProgress().
   *
   * @returns {Promise<UserProgress | null>} The last UserProgress entry.
   */
  static async getLastUserProgress(): Promise<UserProgress | undefined | null> {
    // Delegated to recalculateDailyProgress() for B07 backward-compatibility.
    return this.recalculateDailyProgress();
  }

  /**
   * Retrieves the milestones for a specific user.
   * @returns {Promise<string[]>} List of milestones.
   */
  static async getMilestones(): Promise<string[]> {
    const userID = (await this.session.getInfo()).userID ?? '';

    const milestonesRecords = await DataStore.query(UserProgress, (c) =>
      c.and((c) => [
        c.userID.eq(userID),
        c.Milestones.ne(null),
        c.Milestones.ne(undefined),
      ]),
    );
    return milestonesRecords
      .map((record) => record.Milestones)
      .filter(
        (milestone): milestone is string =>
          !!milestone && milestone.trim() !== '',
      );
  }

  /**
   * Retrieves all tasks completed in the last week.
   * @param {number} [totalTasks] - Maximum number of tasks in one day.
   * @returns {Promise<CompletedTask>} CompletedTask object.
   */
  static async getCompleteTaskWeek(totalTasks: number): Promise<CompletedTask> {
    try {
      const now = new Date(); // Fecha actual
      const dayOfWeek = now.getDay(); // Día de la semana (0 = Domingo, 6 = Sábado)

      // Calculamos el inicio de la semana (domingo)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek); // Retrocede al domingo
      startOfWeek.setHours(0, 0, 0, 0); // Asegura que la hora sea 00:00:00.000
      const startdya = startOfWeek.toISOString();
      const todya = now.toISOString();
      const userProgress = await DataStore.query(UserProgress, (c) =>
        c.and((c) => [c.ts.ge(startdya), c.ts.le(todya)]),
      );

      const taskData: { day: number; tasks: number; saveStreak: boolean }[] =
        userProgress.map((progress) => ({
          day: new Date(progress.ts).getDate(), // Extraer el día del mes
          tasks: progress.completedTasks ?? 0, // Número de tareas completadas
          saveStreak: progress.SaveStreak ?? false,
        }));

      // Evaluar días completos e incompletos
      return this.evaluateCompletedTasks(totalTasks, taskData);
    } catch (error) {
      console.error('Error fetching UserProgress', error);
      throw error;
    }
  }

  /**
   * Retrieves all tasks completed in a specific month and year.
   * @param {number} year - Year.
   * @param {number} month - Month.
   * @param {number} totalTasks - Maximum number of tasks in one day.
   * @returns {Promise<CompletedTask>} CompletedTask object.
   */
  static async getCompletedTasksByMonthYear(
    year: number,
    month: number,
    totalTasks: number,
  ): Promise<CompletedTask> {
    // Obtener datos desde Amplify DataStore
    const startDate = new Date(year, month - 1, 1); // Primer día del mes
    const endDate = new Date(year, month, 0); // Último día del mes

    const userProgress = await DataStore.query(UserProgress, (c) =>
      c.and((c) => [
        c.ts.ge(startDate.toISOString()),
        c.ts.le(endDate.toISOString()),
      ]),
    );

    // Procesar los datos por día
    const taskData: { day: number; tasks: number; saveStreak: boolean }[] =
      userProgress.map((progress) => ({
        day: new Date(progress.ts).getDate(), // Extraer el día del mes
        tasks: progress.completedTasks ?? 0, // Número de tareas completadas
        saveStreak: progress.SaveStreak ?? false,
      }));

    // Evaluar días completos e incompletos
    return this.evaluateCompletedTasks(totalTasks, taskData);
  }

  /**
   * Retrieves the count of tasks completed in a specific month and year.
   * @param {number} year - Year.
   * @param {number} month - Month.
   * @returns {Promise<number>} Count of tasks completed in the month.
   */
  static async getCountTasksByMonthYear(
    year: number,
    month: number,
  ): Promise<number> {
    try {
      // Obtener el rango de fechas del mes especificado
      const startDate = new Date(year, month - 1, 1); // Primer día del mes
      const endDate = new Date(year, month, 0); // Último día del mes

      // Consultar datos desde Amplify DataStore
      const userProgress = await DataStore.query(UserProgress, (c) =>
        c.and((c) => [
          c.ts.ge(startDate.toISOString()),
          c.ts.le(endDate.toISOString()),
        ]),
      );

      // Contar el total de tareas completadas en el mes
      const totalCompletedTasks = userProgress.reduce((acc, progress) => {
        return acc + (progress.completedTasks ?? 0); // Suma tareas completadas
      }, 0);

      return totalCompletedTasks;
    } catch (error) {
      console.error(
        'Error fetching total completed tasks by month and year',
        error,
      );
      throw error;
    }
  }

  /**
   * Evaluates the completed tasks within a month.
   * @param {number} totalTasks - The total number of tasks to evaluate.
   * @param {{ day: number; tasks: number; saveStreak: boolean }[]} taskData - An array of objects containing the day of the month and the number of tasks completed on that day.
   * @returns {CompletedTask} - An object representing the total completed tasks in one month.
   */
  private static evaluateCompletedTasks(
    totalTasks: number,
    taskData: { day: number; tasks: number; saveStreak: boolean }[],
  ): CompletedTask {
    const daysComplete: number[] = [];
    const daysIncomplete: number[] = [];
    const daysSaveStreak: number[] = [];
    taskData.forEach((data) => {
      if (data.tasks >= totalTasks) {
        daysComplete.push(data.day); // Día con tareas completas
      } else if (data.tasks > 0) {
        daysIncomplete.push(data.day); // Día con al menos una tarea
      }
      if (data.saveStreak) {
        daysSaveStreak.push(data.day); // Día en que se salvó la racha
      }
    });
    return { daysComplete, daysIncomplete, daysSaveStreak };
  }

  /**
   * Calculates the difference in days between two dates.
   * @param {Date} startDate - The start date.
   * @param {Date} endDate - The end date.
   * @returns {number} - The number of days between the two dates.
   */
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
  }

  /**
   * Converts a seed value to a milestone.
   * PRESERVED: hardcoded thresholds 11/41/64 (portability-matrix §4.4).
   * Diverge from ConfigModel.gamification — deuda documentada.
   * @param {number} seed - The seed value.
   * @returns {{ seed: number; milestone: string }} - The seed and milestone.
   */
  private static seedToMilestone(seed: number): {
    seed: number;
    milestone: string;
  } {
    if (seed < 11) {
      return { seed, milestone: '' };
    } else if (seed < 41) {
      return { seed: 0, milestone: 'brote' };
    } else if (seed < 64) {
      return { seed: 0, milestone: 'plantula' };
    } else {
      return { seed: 0, milestone: 'flor' };
    }
  }

  /**
   * Handles the milestone assignment process.
   * @param {UserProgress} lastProgress - The last recorded UserProgress entry.
   * @returns {Promise<number>} - The updated seed value.
   */
  private static async handleMilestoneAssignment(
    lastProgress: UserProgress,
  ): Promise<number> {
    const currentDate = new Date();
    const lastProgressDate = new Date(lastProgress.ts);
    /**
     * Checks if a date is the last day of the month.
     * @param {Date} date - The date to check.
     * @returns {boolean} - True if the date is the last day of the month, false otherwise.
     */
    function isLastDayOfMonth(date: Date): boolean {
      const nextDay = new Date(date); // Clonamos la fecha original
      nextDay.setDate(date.getDate() + 1); // Avanzamos un día

      return nextDay.getDate() === 1; // Si el día es 1, significa que la fecha inicial era el último día del mes
    }
    // Calculate the difference in months between the last record and the current date
    const monthsDifference =
      (currentDate.getFullYear() - lastProgressDate.getFullYear()) * 12 +
      (currentDate.getMonth() - lastProgressDate.getMonth());
    if (monthsDifference > 0) {
      const { seed, milestone } = this.seedToMilestone(lastProgress.Seed ?? 0);
      let milestoneTs: string;

      if (isLastDayOfMonth(lastProgressDate)) {
        await this.updateUserProgress(lastProgress.id, {
          Milestones: milestone,
        });
        milestoneTs = lastProgress.ts;
      } else {
        milestoneTs = new Date(
          lastProgressDate.getFullYear(),
          lastProgressDate.getMonth(),
          0,
        ).toISOString();
        await this.createUserProgress(
          {
            Milestones: milestone,
            Seed: lastProgress.Seed,
            completedTasks: 0,
          },
          milestoneTs,
        );
      }
      if (milestone) {
        await GamificationAlertsService.createGerminationSuccessAlert(
          milestone,
          new Date(milestoneTs),
        );
      } else {
        await GamificationAlertsService.createGerminationFailAlert(
          new Date(milestoneTs),
        );
      }
      return seed;
    }
    return lastProgress.Seed ?? 0;
  }
}
