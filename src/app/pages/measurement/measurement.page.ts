/* eslint-disable @typescript-eslint/no-explicit-any */
import { Task } from './../../../models/configuration/measurements.model';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { SessionService } from '@app/core/services/session/session.service';
import { HeaderComponent } from '@app/components/header/header.component';

import { SetupService } from '@app/core/services/view/setup/setup.service';
import { Session } from 'src/models/session.model';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { ProgressBarComponent } from '@app/components/progress-bar/progress-bar.component';
import { ITask } from '@app/Interfaces/ITask';
import {
  differenceInHours,
  differenceInMinutes,
  getWeekOfMonth,
  startOfToday,
  add,
} from 'date-fns';
import { Bonus } from 'src/models/configuration/measurements.model';
import { MeasurementDSService } from '@app/core/services/storage/datastore/measurement-ds.service';
import { LazyMeasurement } from 'src/models';
import { UserProgress } from 'src/models';
import { UserProgressDSService } from '@app/core/services/storage/datastore/user-progress-ds.service';
import { SafeHtmlPipe } from '@app/core/pipes/safe-html.pipe';
import { GamificationService } from '@app/core/services/view/gamification/gamification.service';
import { TestUsersService } from '@app/core/services/auth/test-users.service';
/**
 * Translates day names to numbers.
 * @enum {number}
 */
const translateNameDayToNumber = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

/**
 * Translates week names to week numbers.
 * @enum {number}
 */
const translateWeekNumber = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
};

/**
 * Defines the structure of a measurement object.
 * @property {string} id - The ID of the measurement.
 * @property {number} value - The value of the measurement.
 */
export type Measurement = {
  id: string;
  value: number;
};

/**
 * Defines the structure of a completed task.
 * @property {string} id - The ID of the task.
 * @property {Measurement[]} measurements - Array of measurements associated with the task.
 */
export type TaskCompleted = {
  id: string;
  measurements: Measurement[];
};

/**
 * MeasurementPage component handles task management and bonus features.
 * It interacts with various services to configure and display tasks, and manage session state.
 * @class MeasurementPage
 */
@Component({
  selector: 'app-measurement',
  templateUrl: 'measurement.page.html',
  styleUrls: ['measurement.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    HeaderComponent,
    ProgressBarComponent,
    SafeHtmlPipe,
  ],
})
export class MeasurementPage implements OnInit {
  user: Session | null = null;
  tasks: Task[] | undefined;
  progress: number | undefined;
  totalTask = 1;
  hasTaskComplete = false;
  hasTaskIncomplete = false;
  completedTask = 0;
  userProgress: UserProgress | undefined;
  //FIXME: change type when realize query
  tasksCompleted: any[] = [];

  showBonus = false;
  OpenModalSurprise = false;
  dataBonusConfigurationMeasurement: Record<string, Bonus> | undefined;

  /**
   * Creates an instance of the MeasurementPage component.
   * @param {Router} router - Angular Router service to navigate between routes.
   * @param {SessionService} session - SessionService to manage user session data.
   * @param {SetupService} service - SetupService to handle user configuration flows.
   * @param {ConfigurationAppService} configuration - Service to retrieve configuration data from storage.
   * @param {TestUsersService}userTest - Servicio for validate if user is test user
   */
  constructor(
    private router: Router,
    private session: SessionService,
    private service: SetupService,
    private configuration: ConfigurationAppService,
    private userTest: TestUsersService,
  ) {}
  /**
   * Lifecycle hook that runs on component initialization.
   * @returns {Promise<void>} - A promise that resolves once the component has been initialized.
   */
  async ngOnInit(): Promise<void> {
    this.user = await this.session.getInfo();
    await this.configuration.getConfigurationApp();

    const configMeasurement =
      await this.configuration.getConfigurationMeasurement();
    if (configMeasurement) {
      this.totalTask = this.configuration.countTasks(configMeasurement);
    }
  }
  /**
   * Lifecycle method that runs when the view is about to enter.
   * Fetches the user's last progress and updates the seed property.
   * @async
   * @returns {Promise<void>} - A promise that resolves when data has been loaded.
   */
  async ionViewWillEnter(): Promise<void> {
    const userprogress = await UserProgressDSService.getLastUserProgress();
    if (userprogress) {
      this.userProgress = userprogress;
    }
  }

  /**
   * Retrieves measurement data and configures tasks and bonus logic.
   * @async
   * @returns {Promise<any>} - Resolves when data is loaded and processed.
   */
  async getDataMeasurement(): Promise<any> {
    const configurationMeasurement =
      await this.configuration.getConfigurationMeasurement();

    this.dataBonusConfigurationMeasurement = configurationMeasurement?.bonus;

    if (this.dataBonusConfigurationMeasurement) {
      const today = new Date();
      const month = today.getMonth() + 1;
      const weekOfMonth = getWeekOfMonth(today);
      const weekOfMonthName = Object.keys(translateWeekNumber).find(
        (key) =>
          translateWeekNumber[key as keyof typeof translateWeekNumber] ===
          weekOfMonth,
      );
      if (
        weekOfMonthName &&
        this.dataBonusConfigurationMeasurement[
          'moniliacisis'
        ].schedule.occurrences.includes(weekOfMonthName)
      ) {
        if (
          this.dataBonusConfigurationMeasurement[
            'moniliacisis'
          ].months.includes(month)
        ) {
          const dayOfWeek = today.getDay();
          const dayOfWeekName = Object.keys(translateNameDayToNumber).find(
            (key) =>
              translateNameDayToNumber[
                key as keyof typeof translateNameDayToNumber
              ] === dayOfWeek,
          );
          if (dayOfWeekName) {
            const bonusDayInclude =
              this.dataBonusConfigurationMeasurement[
                'moniliacisis'
              ].schedule.daysOfWeek.includes(dayOfWeekName);
            if (bonusDayInclude) {
              this.showBonus = true;
            }
          }
        }
      }
    }

    if (configurationMeasurement?.tasks) {
      const keysTask = Object.keys(configurationMeasurement.tasks);
      const tasksConfiguration = configurationMeasurement.tasks;
      this.tasks = keysTask.map((key) => {
        // Verifica si 'key' es una clave válida en 'this.measurementService.data.tasks'
        if (key in configurationMeasurement.tasks) {
          const keyName = key as keyof typeof tasksConfiguration;
          const task: Task = configurationMeasurement.tasks[keyName];
          task.id = keyName;

          return task;
        } else {
          throw new Error(`Clave no válida: ${key}`);
        }
      });
      this.tasksCompleted = [];
      const date = new Date();
      const dataMeasurementCompleted =
        await MeasurementDSService.getMeasurementsByDay(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
        );
      if (dataMeasurementCompleted.length) {
        this.hasTaskComplete = true;
        const groupLazyMeasurement = this.groupRemainingLazyMeasurements(
          this.tasksCompleted,
          dataMeasurementCompleted,
        );
        const keysTask = Object.keys(groupLazyMeasurement);

        if (keysTask) {
          keysTask.forEach((taskId) => {
            if (this.tasks) {
              const indexTask = this.tasks?.findIndex(
                (task) => task.id === taskId,
              );
              const task =
                indexTask >= 0 || indexTask ? this.tasks[indexTask] : null;

              if (!this.tasksCompleted.includes(task)) {
                const dataTask: any = { ...task, measurements: [] };
                groupLazyMeasurement[taskId].forEach((key) => {
                  // const keyName = key as keyof typeof measurement.data;
                  const measurementData =
                    configurationMeasurement.measurements[key.id];
                  if (measurementData) {
                    measurementData.id = key.id;
                    measurementData.value = key.value;

                    dataTask.measurements.push(measurementData);
                  }
                });
                this.tasksCompleted.push(dataTask);
                this.tasks.splice(indexTask, 1);
              }
            }
          });
        }
        this.tasks.forEach((task: Task) => {
          const taskIncludeTaskCompleteIndex = this.tasksCompleted.findIndex(
            (taskCompleted: ITask) => taskCompleted.id === task.id,
          );
          if (taskIncludeTaskCompleteIndex >= 0) {
            this.tasks?.splice(taskIncludeTaskCompleteIndex, 1);
          }
        });
      }
    }
  }

  /**
   * Groups remaining measurements by their associated tasks.
   * @param {TaskCompleted[]} tasksCompleted - List of completed tasks.
   * @param {LazyMeasurement[]} dataMeasurementCompleted - Completed measurements data.
   * @returns {Record<string, Measurement[]>} - Grouped measurements by task ID.
   */
  groupRemainingLazyMeasurements(
    tasksCompleted: TaskCompleted[],
    dataMeasurementCompleted: LazyMeasurement[],
  ): Record<string, Measurement[]> {
    // 1. Obtener las claves de las mediciones ya presentes en tasksCompleted
    const existingMeasurementIds = tasksCompleted.flatMap((task) =>
      task.measurements.map((m) => m.id),
    );

    // 2. Procesar mediciones restantes que no estén en las existentes
    const remainingMeasurements = dataMeasurementCompleted.filter(
      (lazyMeasurement) => {
        if (!lazyMeasurement.data) {
          return false;
        } // Ignorar si no hay data

        const parsedData =
          typeof lazyMeasurement.data === 'string'
            ? (JSON.parse(lazyMeasurement.data) as Record<
                string,
                string
              > | null)
            : lazyMeasurement.data;

        if (!parsedData) {
          return false;
        } // Ignorar si parsedData es null o undefined

        const measurementIds = Object.keys(parsedData);
        return measurementIds.some(
          (id) => !existingMeasurementIds.includes(id),
        );
      },
    );

    // 3. Agrupar mediciones restantes por tarea
    const groupedMeasurements: Record<string, Measurement[]> =
      remainingMeasurements.reduce(
        (acc, lazyMeasurement) => {
          const taskId = lazyMeasurement.task || 'unknown'; // Si no hay task, usar 'unknown'

          // Asegurar que el grupo para la tarea exista
          if (!acc[taskId]) {
            acc[taskId] = [];
          }

          // Transformar `data` si es string o directamente usar el objeto
          const parsedData =
            typeof lazyMeasurement.data === 'string'
              ? (JSON.parse(lazyMeasurement.data) as Record<
                  string,
                  string
                > | null)
              : lazyMeasurement.data;

          if (!parsedData) {
            return acc;
          } // Ignorar si parsedData es null o undefined

          const measurementEntries: Measurement[] = Object.entries(
            parsedData,
          ).map(([key, value]) => ({
            id: key,
            value: parseFloat(value), // Convertimos el string a número
          }));

          // Agregar mediciones al grupo correspondiente
          acc[taskId].push(...measurementEntries);

          return acc;
        },
        {} as Record<string, Measurement[]>,
      );

    return groupedMeasurements;
  }

  /**
   * Executes logic when the view enters.
   * @async
   * @returns {Promise<void>} - Resolves after executing necessary logic.
   */
  async ionViewDidEnter(): Promise<void> {
    await this.getDataMeasurement();
    const userprogress = await UserProgressDSService.getLastUserProgress();
    if (userprogress) {
      this.userProgress = userprogress;
    }
  }

  /**
   * Signs out the user and redirects to the home page.
   * @returns {Promise<void>} - A promise that resolves once the user is signed out and redirected.
   */
  async close(): Promise<void> {
    const response = await this.service.signOut();
    if (response) {
      this.session.clearSession();
      await this.router.navigate([''], {
        replaceUrl: true,
      });
    }
  }

  /**
   * Navigates to the register page for a specific task.
   * @param {ITask} task - The task to register data for.
   */
  goToRegister(task: ITask): void {
    if (
      this.hasRestrictionTimeTask(task as Task) &&
      !this.userTest.isTestUser(this.user?.phone ?? '')
    ) {
      return;
    }
    if (task.flows) {
      const flowId = task.flows.find((flow) => {
        return !task.flowsComplete?.includes(flow);
      });
      if (flowId) {
        void this.router.navigate(['register-measurement-new'], {
          queryParams: {
            flowId: flowId,
            taskId: task.id,
          },
        });
      }
    }
  }

  /**
   * se ejecuta con la accion del usuario
   * @param {boolean} response true si respondio, false si omitio
   */
  async responseBonus(response: boolean): Promise<void> {
    if (response) {
      await GamificationService.surpriseTaskProcess();
    }
    this.OpenModalSurprise = false;
  }

  /**
   * Checks if a task has a time restriction and if the current time is within the allowed window.
   * @param {Task} task - The task to check for time restrictions.
   * @returns {boolean} - True if there is a restriction and the current time is not within the allowed window; otherwise, false.
   */
  hasRestrictionTimeTask(task: Task): boolean {
    if (task.restrictions.activeTime.enabled) {
      const startTimeRestriction =
        task.restrictions.activeTime.start.split(':');
      const endTimeRestriction = task.restrictions.activeTime.end.split(':');

      const dateStartRestriction = add(startOfToday(), {
        hours: Number(startTimeRestriction[0]),
        minutes: Number(startTimeRestriction[1]),
      });
      const dateEndRestriction = add(startOfToday(), {
        hours: Number(endTimeRestriction[0]),
        minutes: Number(endTimeRestriction[1]),
      });

      if (
        !(dateStartRestriction < new Date() && dateEndRestriction > new Date())
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets a string describing the time restriction for a task, if any.
   * @param {Task} task - The task to check.
   * @returns {string} - A string describing the time restriction, or an empty string if there is no restriction.
   */
  getTextRestrictionTime(task: Task): string {
    if (task.restrictions.activeTime.enabled) {
      const startTimeRestriction =
        task.restrictions.activeTime.start.split(':');
      const endTimeRestriction = task.restrictions.activeTime.end.split(':');
      const dateStartRestriction = add(startOfToday(), {
        hours: Number(startTimeRestriction[0]),
        minutes: Number(startTimeRestriction[1]),
      });
      if (dateStartRestriction > new Date()) {
        const timeDifferenceHours = differenceInHours(
          dateStartRestriction,
          new Date(),
        );
        const timeDifferenceMinutes = differenceInMinutes(
          dateStartRestriction,
          new Date(),
        );
        if (timeDifferenceHours < 1) {
          return `Disponible en ${timeDifferenceMinutes} minutos`;
        }
        if (timeDifferenceMinutes - timeDifferenceHours * 60) {
          return `Disponible en ${timeDifferenceHours} horas y ${timeDifferenceMinutes - timeDifferenceHours * 60} minutos`;
        } else {
          return `Disponible en ${timeDifferenceHours} horas`;
        }
        // return `Disponible a partir de las ${startTimeRestriction[0]}:${startTimeRestriction[1]}`;
      } else {
        return `Disponible hasta las ${endTimeRestriction[0]}:${endTimeRestriction[1]}`;
      }
    } else {
      return '';
    }
  }
}
