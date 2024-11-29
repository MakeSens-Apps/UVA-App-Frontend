import { DataStore } from '@aws-amplify/datastore';
import { UserProgress } from 'src/models';
import { SortDirection, Predicates } from '@aws-amplify/datastore';
import { SessionService } from '../../session/session.service';

export interface CompletedTask {
  daysComplete: number[];
  daysIncomplete: number[];
}
/**
 * Service for managing UserProgress data.
 */
export class UserProgressDSService {
  static session = new SessionService();
  /**
   * Adds a new UserProgress entry.
   * @param {number} seed - Seed value.
   * @param {number} streak - Streak count.
   * @param {number} completedTasks - Number of completed tasks.
   * @param {string} milestones - Milestones achieved.
   * @returns {Promise<UserProgress>} The newly created UserProgress.
   */
  static async addUserProgress(
    seed?: number,
    streak?: number,
    completedTasks?: number,
    milestones?: string,
  ): Promise<UserProgress> {
    try {
      let userID = (await this.session.getInfo()).userID ?? '';
      let ts = new Date().toISOString();

      return await DataStore.save(
        new UserProgress({
          ts,
          Seed: seed,
          Streak: streak,
          Milestones: milestones,
          completedTasks,
          userID,
        }),
      );
    } catch (error) {
      console.error('Error adding UserProgress', error);
      throw error;
    }
  }

  /**
   * Retrieves all progress entries for a specific user.
   * @param {number} [limit] - Maximum number of entries to retrieve.
   * @param {SortDirection} [sortDirection] - Sorting direction: SortDirection.ASCENDING or SortDirection.DESCENDING.
   * @returns {Promise<UserProgress[]>} List of UserProgress entries.
   */
  static async getUserProgress(
    limit?: number,
    sortDirection: SortDirection = SortDirection.DESCENDING,
  ): Promise<UserProgress[]> {
    try {
      return await DataStore.query(UserProgress, Predicates.ALL, {
        sort: (up) => up.ts(sortDirection),
        limit,
      });
    } catch (error) {
      console.error('Error fetching UserProgress', error);
      throw error;
    }
  }

 /**
   * Retrieves all task completed in the last week.
   * @param {number} [totalTasks] - Maximun number of task in one day
   * @returns {Promise<CompletedTask>} CompletedTask
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

      const taskData: { day: number; tasks: number }[] = userProgress.map(
        (progress) => ({
          day: new Date(progress.ts).getDate(), // Extraer el día del mes
          tasks: progress.completedTasks ?? 0, // Número de tareas completadas
        }),
      );

      // Evaluar días completos e incompletos
      return this.evaluateCompletedTasks(totalTasks, taskData);
    } catch (error) {
      console.error('Error fetching UserProgress', error);
      throw error;
    }
  }

  /**
   * 
   * @param {number} year Year
   * @param {number} month month
   * @param {number} totalTasks - Maximun number of task in one day
   * @returns {Promise<CompletedTask>} CompletedTask in month
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
    const taskData: { day: number; tasks: number }[] = userProgress.map(
      (progress) => ({
        day: new Date(progress.ts).getDate(), // Extraer el día del mes
        tasks: progress.completedTasks ?? 0, // Número de tareas completadas
      }),
    );

    // Evaluar días completos e incompletos
    return this.evaluateCompletedTasks(totalTasks, taskData);
  }

  /**
   * 
   * @param {number} year year
   * @param {number} month month
   * @returns {Promise<number>} counter task in one month
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
   * Retrieves lastUser.
   * @returns {Promise<UserProgress>} List of UserProgress entries.
   */
  static async getLastUserProgress(): Promise<UserProgress | null> {
    const progressEntries = await this.getUserProgress(
      1,
      SortDirection.DESCENDING,
    );
    return progressEntries.length > 0 ? progressEntries[0] : null;
  }
  /**
   * Description
   * @returns {Promise<string[]>} return
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

  private static evaluateCompletedTasks(
    totalTasks: number,
    taskData: { day: number; tasks: number }[],
  ): CompletedTask {
    const daysComplete: number[] = [];
    const daysIncomplete: number[] = [];

    taskData.forEach((data) => {
      if (data.tasks >= totalTasks) {
        daysComplete.push(data.day); // Día con tareas completas
      } else if (data.tasks > 0) {
        daysIncomplete.push(data.day); // Día con al menos una tarea
      }
    });

    return { daysComplete, daysIncomplete };
  }
}
