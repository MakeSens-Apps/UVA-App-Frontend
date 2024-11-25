/* eslint-disable @typescript-eslint/no-explicit-any */
import { Task } from './../../../models/configuration/measurements.model';
import { MeasurementService } from './measurement.service';
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
 * MeasurementPage component handles task management and bonus features.
 * It interacts with various services to configure and display tasks, and manage session state.
 * @class MeasurementPage
 */
@Component({
  selector: 'app-measurement',
  templateUrl: 'measurement.page.html',
  styleUrls: ['measurement.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, HeaderComponent, ProgressBarComponent],
})
export class MeasurementPage implements OnInit {
  user: Session | null = null;
  tasks: Task[] | undefined;
  progress: number | undefined;

  hasTaskComplete = false;
  hasTaskIncomplete = false;
  completedTask = 0;

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
   * @param {MeasurementService} measurementService - Service to manage measurement tasks.
   */
  constructor(
    private router: Router,
    private session: SessionService,
    private service: SetupService,
    private configuration: ConfigurationAppService,
    private measurementService: MeasurementService,
  ) {}

  /**
   * Lifecycle hook that runs on component initialization.
   * @returns {Promise<void>} - A promise that resolves once the component has been initialized.
   */
  async ngOnInit(): Promise<void> {
    this.user = await this.session.getInfo();
    await this.configuration.getConfigurationApp();

    const configurationMeasurement = JSON.parse(
      (await this.configuration.getConfigurationMeasurement()) as any,
    );
    await this.configuration.getConfigurationColors();
    await this.configuration.loadBranding();

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

    if (configurationMeasurement.tasks) {
      const keysTask = Object.keys(configurationMeasurement.tasks);

      this.tasks = keysTask.map((key) => {
        const keyName = key as keyof typeof this.measurementService.data.tasks;
        const task: Task = configurationMeasurement.tasks[keyName];
        task.id = keyName;
        /* if (task.completed) {
          this.completedTask++;
        } */

        return task;
      });

      //TODO: set when the user has completed at least one task
      // this.hasTaskComplete = this.tasks.some((task) => task.completed);

      //FIXME : Example de task complete ( remove on query Service)
      this.hasTaskComplete = true;
      const dataTaskCompleted = {
        task1: {
          name: 'Temperatura y humedad (mañana) &#x1f321;️',
          measurements: {
            TEMPERATURA_MIN: {
              shortName: 'temperatura min',
              unit: '°C',
              value: 22,
            },
            TEMPERATURA_MAX: {
              shortName: 'temperatura max',
              unit: '°C',
              value: 30,
            },
          },
        },
      };

      /* Object.keys(dataTaskCompleted).forEach((key) => {
      const keyName = key as keyof typeof dataTaskCompleted;
      const task: ITask = dataTaskCompleted[keyName];
      task.id = keyName;
        this.completedTask++;
      this.tasksCompleted.push(task);
    }); */
      // this.hasTaskIncomplete = this.tasks.some((task) => !task.completed);

      this.hasTaskIncomplete = true;
      this.tasksCompleted = this.transformDataTaskCompleted(dataTaskCompleted);

      this.progress = this.measurementService.getProgress();
    }
  }

  /**
   * Transforms data of completed tasks into a format compatible with the task model.
   * @param {any} data - Data of completed tasks.
   * @returns {any[]} - An array of transformed task data.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  transformDataTaskCompleted(data: any): any {
    const keysTask = Object.keys(data);

    return keysTask.map((key) => {
      const keyName = key as keyof typeof this.measurementService.data.tasks;
      const task = data[keyName];
      task.id = keyName;
      this.completedTask++;

      const measurement = Object.keys(task.measurements).map((key) => {
        const keyName = key as keyof typeof task.measurements;
        const measurement = task.measurements[keyName];
        measurement.id = keyName;
        return measurement;
      });
      task.measurements = measurement;

      return task;
    });
  }

  /*  ionViewDidEnter(): void {
        if (this.tasks) {
      this.hasTaskComplete = this.tasks.some((task) => task.completed);
      this.hasTaskIncomplete = this.tasks.some((task) => !task.completed);
      this.progress = this.measurementService.getProgress();
    } 
  }*/

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
   * Downloads and loads configuration and branding data asynchronously.
   * @async
   * @returns {Promise<void>} - A promise that resolves once the data download and branding load are complete.
   * @description This function triggers the downloading of configuration data by calling `downLoadData`
   * and then applies branding settings by calling `loadBranding` from the `configuration` service.
   */
  async DownloadData(): Promise<void> {
    await this.configuration.downLoadData();
    await this.configuration.loadBranding();
  }

  /**
   * Navigates to the register page for a specific task.
   * @param {ITask} task - The task to register data for.
   */
  goToRegister(task: ITask): void {
    if (this.hasRestrictionTimeTask(task as Task)) {
      return;
    }
    if (task.flows) {
      const flowId = task.flows.find((flow) => {
        return !task.flowsComplete?.includes(flow);
      });
      if (flowId) {
        void this.router.navigate(['app/tabs/register/measurement-new'], {
          queryParams: {
            flowId: flowId,
            taskId: task.id,
          },
        });
      }
    }
  }

  /**
   * Closes the bonus modal.
   */
  responseBonus(): void {
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
