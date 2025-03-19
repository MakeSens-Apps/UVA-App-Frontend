/* eslint-disable @typescript-eslint/no-explicit-any */
import { Task } from './../../../../models/configuration/measurements.model';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonCheckbox,
  IonIcon,
  IonButton,
  ModalController,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '@app/components/header/header.component';
import { ActivatedRoute } from '@angular/router';
import { calendar } from '@app/components/calendar/calendar.component';
import { DayComponent } from '../../../components/calendar/day/day.component';
import { format, isYesterday, setDefaultOptions } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { AlertComponent } from '@app/components/alert/alert.component';
import { UserProgress, LazyMeasurement } from 'src/models';
import { UserProgressDSService } from '@app/core/services/storage/datastore/user-progress-ds.service';
import { MeasurementDSService } from '@app/core/services/storage/datastore/measurement-ds.service';
import { ITask } from '@app/Interfaces/ITask';
import {
  Measurement,
  TaskCompleted,
} from '@app/pages/measurement/measurement.page';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { SafeHtmlPipe } from '@app/core/pipes/safe-html.pipe';
import { GamificationService } from '@app/core/services/view/gamification/gamification.service';
setDefaultOptions({ locale: es });
// Define constants for repeated values
const unknownTaskId = 'unknown';
const modalContent = `
  <h2 style="color: var(--Colors-Blue-900);"> Recupera tu racha pagando: </h2>
  <h2> <span>5</span>  <img src="../../../../assets/images/icons/semilla.svg" alt="seed" style="width: 100px; height: 100px; margin: 10px 0;"></h2>
  <p> ¿Quieres pagar 5 semillas para recuperar tu racha?</p>
`;
/**
 * Component representing the measurement details page.
 * This component displays details of a selected date and provides
 * an option to pay and recover a streak.
 */
@Component({
  selector: 'app-measurement-detail',
  templateUrl: './measurement-detail.page.html',
  styleUrls: ['./measurement-detail.page.scss'],
  standalone: true,
  imports: [
    IonButton,
    IonIcon,
    IonCheckbox,
    IonContent,
    HeaderComponent,
    CommonModule,
    FormsModule,
    DayComponent,
    SafeHtmlPipe,
  ],
})
export class MeasurementDetailPage implements OnInit {
  date: calendar | undefined;
  dateFormatted: string | undefined;
  showAlert_incomplete = true;
  showAlert_complete_seed = false;
  isYesterday = false;
  userProgress: UserProgress | undefined;

  hasTaskComplete = false;
  tasks: Task[] | undefined;
  tasksCompleted: any[] = [];

  /**
   * Constructor to inject ActivatedRoute and ModalController services.
   * @param {ActivatedRoute} route - Service for accessing the route parameters.
   * @param {ModalController} modalCtrl - Service for handling modals.
   * @param {ConfigurationAppService} configuration - Service to retrieve configuration data from storage.
   */
  constructor(
    private route: ActivatedRoute,
    private modalCtrl: ModalController,
    private configuration: ConfigurationAppService,
  ) {}

  /**
   * Lifecycle hook that runs after component initialization.
   * Subscribes to query parameters and sets formatted date if available.
   * @returns {void}
   */
  async ngOnInit(): Promise<void> {
    await this.initializeUserProgress();
    this.subscribeToRouteParams();
  }

  /**
   * Initializes the user progress by fetching the last user progress data.
   * Sets the `showAlert_incomplete` flag based on the user's seed count.
   * @returns {Promise<void>}
   */
  private async initializeUserProgress(): Promise<void> {
    const userProgress = await UserProgressDSService.getLastUserProgress();
    if (userProgress) {
      this.userProgress = userProgress;
      if (userProgress.Seed) {
        this.showAlert_incomplete = userProgress.Seed < 5;
      }
    }
  }

  /**
   * Subscribes to route query parameters and processes the date and tasks.
   * @returns {void}
   */
  private subscribeToRouteParams(): void {
    this.route.queryParams.subscribe((params: any) => {
      void this.processRouteParams(params);
    });
  }

  /**
   * Processes the route parameters, formats the date, and loads tasks and measurements.
   * @param {any} params - The route query parameters.
   * @returns {Promise<void>}
   */
  private async processRouteParams(params: any): Promise<void> {
    this.date = params;
    if (this.date?.date) {
      this.dateFormatted = format(
        new Date(this.date.date),
        "EEEE d 'de' MMMM, yyyy",
      );
      this.isYesterday = isYesterday(this.date.date);

      const date = new Date(this.date.date);
      await this.loadTasksAndMeasurements(date);
    }
  }

  /**
   * Loads tasks and measurements for a specific date.
   * Handles the grouping of measurements and filtering of completed tasks.
   * @param {Date} date - The date to load tasks and measurements for.
   * @returns {Promise<void>}
   */
  private async loadTasksAndMeasurements(date: Date): Promise<void> {
    try {
      const dataMeasurementCompleted =
        await MeasurementDSService.getMeasurementsByDay(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
        );

      const configurationMeasurement =
        await this.configuration.getConfigurationMeasurement();
      if (!configurationMeasurement) {
        return;
      }

      this.initializeTasks(configurationMeasurement);
      this.processCompletedMeasurements(
        dataMeasurementCompleted,
        configurationMeasurement,
      );
    } catch (error) {
      console.error(
        '📛❌⛔️ ~ MeasurementDetailPage ~ error in loadTasksAndMeasurements:',
        error,
      );
    }
  }

  /**
   * Initializes the tasks based on the configuration.
   * @param {any} configurationMeasurement - The configuration data for measurements.
   * @returns {void}
   */
  private initializeTasks(configurationMeasurement: any): void {
    const keysTask = Object.keys(configurationMeasurement.tasks);
    //const tasksConfiguration = configurationMeasurement.tasks;
    this.tasks = keysTask.map((key) => {
      if (key in configurationMeasurement.tasks) {
        const keyName = key as string; // Ensure keyName is treated as a string
        const task: Task = configurationMeasurement.tasks[keyName];
        task.id = keyName; // Assign keyName as a string
        return task;
      } else {
        throw new Error(`Clave no válida: ${key}`);
      }
    });
  }

  /**
   * Processes completed measurements, groups them, and filters out completed tasks.
   * @param {LazyMeasurement[]} dataMeasurementCompleted - The completed measurements data.
   * @param {any} configurationMeasurement - The configuration data for measurements.
   * @returns {void}
   */
  private processCompletedMeasurements(
    dataMeasurementCompleted: LazyMeasurement[],
    configurationMeasurement: any,
  ): void {
    this.tasksCompleted = [];
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
            const task = this.tasks.find((task) => task.id === taskId);
            if (task && !this.tasksCompleted.includes(task)) {
              // Crear una copia independiente de la tarea
              const dataTask: any = { ...task, measurements: [] };

              groupLazyMeasurement[taskId].forEach((key) => {
                const measurementData =
                  configurationMeasurement?.measurements[key.id];
                if (measurementData) {
                  // Crear una copia independiente de cada medición
                  const clonedMeasurement = { ...measurementData };
                  clonedMeasurement.id = key.id;
                  clonedMeasurement.value = key.value;
                  dataTask.measurements.push(clonedMeasurement);
                }
              });

              // Agregar la tarea clonada a tasksCompleted
              this.tasksCompleted.push(dataTask);
            }
          }
        });
      }

      // Filtrar las tareas ya completadas
      this.tasks = this.tasks?.filter(
        (task) =>
          !this.tasksCompleted.some(
            (taskCompleted: ITask) => taskCompleted.id === task.id,
          ),
      );
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
          const taskId = lazyMeasurement.task || unknownTaskId; // Use camelCase constant name

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
   * Opens a modal to allow the user to pay to restore a streak.
   * If the modal action is confirmed, updates the date status and
   * displays the complete-seed alert.
   * @async
   * @returns {Promise<void>} Resolves when modal is closed and processed.
   */
  async openModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AlertComponent,
      componentProps: {
        content: modalContent, // Use camelCase constant name
        textCancelButton: 'omitir',
        textOkButton: 'Pagar',
        reverseButton: true,
        bordersInCancelBtn: false,
        colorBtn: 'uva_blue-600',
      },
      cssClass: 'custom-modal_recover-series',
      backdropDismiss: false,
    });

    // Recibir la respuesta del modal
    modal
      .onDidDismiss()
      .then(async (data) => {
        if (data.data.action === 'OK') {
          if (this.date) {
            await GamificationService.recoverStreak();
            this.date = { ...this.date, state: 'complete' };
            this.showAlert_complete_seed = true;
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });

    await modal.present();
  }
}
