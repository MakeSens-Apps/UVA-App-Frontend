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
   * Retrieves the last progress entry for a specific user.
   * @returns {Promise<UserProgress | null>} The last UserProgress entry.
   */
  static async getLastUserProgress(): Promise<UserProgress | undefined | null> {
    // A. Obtener último registro
    const lastsProgress = await this.getUserProgress(
      1,
      SortDirection.DESCENDING,
    );

    // B. Si no hay registros previos, retornar null
    if (!lastsProgress.length) {
      return null;
    }

    const lastProgress = lastsProgress[0];
    // Convertir fechas para el cálculo de la diferencia
    const currentDate = new Date();
    const lastProgressDate = new Date(lastProgress.ts);

    // Calcular la diferencia en días entre el último registro y la fecha actual
    const daysDifference = this.calculateDaysDifference(
      lastProgressDate,
      currentDate,
    );
    // Handle milestone assignment if necessary
    const newSeed = await this.handleMilestoneAssignment(lastProgress);

    if (daysDifference === 0) {
      return lastProgress;
    } else if (daysDifference === 1) {
      // Día inmediatamente anterior: Mantener racha
      const newUserProgress = await this.createUserProgress({
        completedTasks: 0,
        Seed: newSeed,
        Streak:
          lastProgress.completedTasks === 0 ? 0 : (lastProgress.Streak ?? 0),
      });
      return newUserProgress;
    } else {
      // Más de un día de inactividad: Reiniciar racha
      return await this.createUserProgress({
        completedTasks: 0,
        Seed: newSeed,
        Streak: 0,
      });
    }
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

      if (isLastDayOfMonth(lastProgressDate)) {
        await this.updateUserProgress(lastProgress.id, {
          Milestones: milestone,
        });
      } else {
        await this.createUserProgress(
          {
            Milestones: milestone,
            Seed: lastProgress.Seed,
            completedTasks: 0,
          },
          new Date(
            lastProgressDate.getFullYear(),
            lastProgressDate.getMonth(),
            0,
          ).toISOString(),
        );
      }
      return seed;
    }
    return lastProgress.Seed ?? 0;
  }
}
