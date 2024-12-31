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
setDefaultOptions({ locale: es });

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
    const userProgress = await UserProgressDSService.getLastUserProgress();
    if (userProgress) {
      this.userProgress = userProgress;
      if (userProgress.Seed) {
        this.showAlert_incomplete = userProgress.Seed < 5;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.route.queryParams.subscribe((params: any) => {
      this.date = params;
      if (this.date?.date) {
        this.dateFormatted = format(
          new Date(this.date.date),
          "EEEE d 'de' MMMM, yyyy",
        );
        this.isYesterday = isYesterday(this.date.date);
      }
      if (this.date?.date) {
        const date = new Date(this.date.date);
        MeasurementDSService.getMeasurementsByDay(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
        )
          .then(async (dataMeasurementCompleted) => {
            const configurationMeasurement =
              await this.configuration.getConfigurationMeasurement();
            if (!configurationMeasurement) {
              return;
            }
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
            if (dataMeasurementCompleted.length) {
              const configurationMeasurement =
                await this.configuration.getConfigurationMeasurement();
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
                      indexTask >= 0 || indexTask
                        ? this.tasks[indexTask]
                        : null;

                    if (!this.tasksCompleted.includes(task)) {
                      const dataTask: any = { ...task, measurements: [] };
                      groupLazyMeasurement[taskId].forEach((key) => {
                        // const keyName = key as keyof typeof measurement.data;
                        const measurementData =
                          configurationMeasurement?.measurements[key.id];
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
              this.tasks?.forEach((task: Task) => {
                const taskIncludeTaskCompleteIndex =
                  this.tasksCompleted.findIndex(
                    (taskCompleted: ITask) => taskCompleted.id === task.id,
                  );
                if (taskIncludeTaskCompleteIndex >= 0) {
                  this.tasks?.splice(taskIncludeTaskCompleteIndex, 1);
                }
              });
            }
          })
          .catch((error) => {
            console.error(
              '📛❌⛔️ ~ MeasurementDetailPage ~ ).then ~ error:',
              error,
            );
          });
      }
    });
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
        content: `
        <h2 style="color:  var(--Colors-Blue-900);"> Recupera tu racha pagando: </h2>
        <h2> <span>5</span>  <img src="../../../../assets/images/icons/semilla.svg" alt="seed" style="width: 100px; height: 100px; margin: 10px 0;"></h2>
        <p> ¿Quieres pagar 5 semillas para recuperar tu racha?</p>
        `,
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
            //TODO : AQUI REALIZAR ACCIONES DE RECUPERACION DE RACHO
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
