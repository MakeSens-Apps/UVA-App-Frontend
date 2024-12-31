import { DataStore } from '@aws-amplify/datastore';
import { UserProgress } from 'src/models';
import { SortDirection, Predicates } from '@aws-amplify/datastore';
import { SessionService } from '../../session/session.service';

export interface CompletedTask {
  daysComplete: number[];
  daysIncomplete: number[];
}
type UserProgressFields = Partial<Omit<UserProgress, 'id' | 'ts' | 'userID'>>;
/**
 * Service for managing UserProgress data.
 */
export class UserProgressDSService {
  static session = new SessionService();
  /**
   * Adds a new UserProgress entry.
   * @param {UserProgressFields} userData - userData
   * @returns {Promise<UserProgress>} The newly created UserProgress.
   */
  static async createUserProgress(
    userData: UserProgressFields,
  ): Promise<UserProgress | undefined> {
    try {
      const userID = (await this.session.getInfo()).userID ?? '';

      const newUserProgress = await DataStore.save(
        new UserProgress({
          ts: new Date().toISOString(),
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
   * Update a UserProgress entry for id
   * @param {string} id - id
   * @param {UserProgressFields} updatedFields - updatedFields
   * @returns {Promise<UserProgress>} The newly created UserProgress.
   */
  static async updateUserProgress(
    id: string,
    updatedFields: UserProgressFields,
  ): Promise<UserProgress | void> {
    try {
      const userProgress = await DataStore.query(UserProgress, id);
      if (!userProgress) {
        console.error('UserProgress not found');
        return;
      }

      const updatedUserProgress = await DataStore.save(
        UserProgress.copyOf(userProgress, (updated) => {
          Object.assign(updated, updatedFields);
        }),
      );
      return updatedUserProgress;
    } catch (error) {
      console.error('Error updating UserProgress:', error);
    }
  }

  /**
   * Retrieves all progress entries for a specific user.
   * @param {number} [limit] - Maximum number of entries to retrieve.
   * @param {SortDirection} [sortDirection] - Sorting direction: SortDirection.ASCENDING or SortDirection.DESCENDING.
   * @returns {Promise<UserProgress[]>} List of UserProgress entries.
   */
  static async getUserProgress(
    limit = 1,
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
   * Retrieves laswt progress entries for a specific user.
   * @returns {Promise<UserProgress | null>} List of UserProgress entries.
   */
  static async getLastUserProgress(): Promise<UserProgress | null> {
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
    //const processedProgress = await this.processUserProgress(lastProgress[0]);

    return lastProgress[0];
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
   * Evaluates the completed tasks within a month.
   * @param {number} totalTasks - The total number of tasks to evaluate.
   * @param {{ day: number; tasks: number }[]} taskData - An array of objects containing the day of the month and the number of tasks completed on that day.
   * @returns {CompletedTask} - An object representing the total completed tasks in one month.
   */
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
