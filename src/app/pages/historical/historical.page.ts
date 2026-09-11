import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AreachartComponent } from '@app/components/areachart/areachart.component';
import {
  calendar,
  CalendarComponent,
} from '@app/components/calendar/calendar.component';
import { HeaderComponent } from '@app/components/header/header.component';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { MeasurementDSService } from '@app/core/services/storage/datastore/measurement-ds.service';
import { UserProgressDSService } from '@app/core/services/storage/datastore/user-progress-ds.service';
import {
  IonButton,
  IonCol,
  IonContent,
  IonGrid,
  IonIcon,
  IonLabel,
  IonRow,
} from '@ionic/angular/standalone';
import {
  Graph,
  Historical,
  MeasurementModel,
} from 'src/models/configuration/measurements.model';

import { EnvironmentalReportService } from '@app/core/services/view/environmental-report.service';
import { ShareService } from '@app/core/services/view/share.service';
import { LoadingController, ToastController } from '@ionic/angular';
import { Measurement } from 'src/models';
import {
  CompleteTaskHistorical,
  DailyStats,
  DetailedMeasurementEntry,
  HistoricalMeasurement,
  MeasurementEntry,
  monthsNames,
  TimeFrame,
  TypeView,
} from './historical.model';
import { TimeFrameComponent } from './time-frame/time-frame.component';

@Component({
  selector: 'app-historical',
  templateUrl: 'historical.page.html',
  styleUrls: ['historical.page.scss'],
  standalone: true,
  imports: [
    IonIcon,
    IonButton,
    CommonModule,
    HeaderComponent,
    CalendarComponent,
    TimeFrameComponent,
    IonGrid,
    IonRow,
    IonCol,
    IonLabel,
    IonContent,
    AreachartComponent,
    FormsModule,
  ],
})

/**
 * Component for displaying historical data, including measurements and calendar-based data views.
 * Provides functionality to switch between month and year views, and toggles between chart and calendar displays.
 */
export class HistoricalPage implements OnInit {
  seed: number | undefined | null;
  timeFrame: TimeFrame = 'month';
  typeView: TypeView = 'calendar';
  nRegisters: number | undefined;
  measuresConfig: MeasurementModel | null | undefined;
  measuresMonth: HistoricalMeasurement = {};
  measuresYear: HistoricalMeasurement[] = [{}];
  completedTaskMonth: CompleteTaskHistorical | undefined;
  completedTaskYear: CompleteTaskHistorical[] | undefined;
  measureSelected: Historical | undefined;
  currentMonthIndex: number = new Date().getMonth();
  currentYearIndex = new Date().getFullYear();

  variables: Historical[] = [];
  monthsNames = monthsNames;
  realCurrentYear: number = new Date().getFullYear();
  @ViewChild(CalendarComponent) calendarComponent!: CalendarComponent;
  @ViewChild(AreachartComponent) areaChartComponent!: AreachartComponent;

  /**
   * Initializes component with router and change detector.
   * @param {Router} router - Provides navigation between pages.
   * @param {ChangeDetectorRef} ref - Detects changes in component data.
   * @param {ConfigurationAppService} configuration Manage configuration app
   * @param {EnvironmentalReportService} environmentalReportService - Service for generating environmental reports
   * @param {ShareService} shareService - Service for sharing content
   * @param {LoadingController} loadingController - Ionic loading controller
   * @param {ToastController} toastController - Ionic toast controller
   */
  constructor(
    private router: Router,
    private ref: ChangeDetectorRef,
    private configuration: ConfigurationAppService,
    private environmentalReportService: EnvironmentalReportService,
    private shareService: ShareService,
    private loadingController: LoadingController,
    private toastController: ToastController,
  ) {}

  /**
   * OnInit lifecycle hook. Sets the initial state of the historical and measurement data.
   * @returns {Promise<void>}
   */
  async ngOnInit(): Promise<void> {
    await this.initializeRegisters();
    await this.initializeCompletedTasks();
    this.measuresConfig =
      await this.configuration.getConfigurationMeasurement();
    if (this.measuresConfig?.historical) {
      await this.initializeVariables(this.measuresConfig.historical);
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
      this.seed = userprogress.Seed;
    }
  }
  /**
   * Toggles the view mode between calendar and chart.
   * @returns {Promise<void>}
   */
  async changeModeData(): Promise<void> {
    this.typeView = this.typeView === 'calendar' ? 'chart' : 'calendar';
    if (this.typeView === 'chart') {
      this.measureSelected = this.variables[0];
      this.measureSelected.selected = true;

      await this.updateChart(this.measureSelected.graph);
    } else {
      this.variables.forEach((variable) => {
        variable.selected = false;
      });
    }
    this.ref.detectChanges();
  }

  /**
   * Changes the timeFrame view between month and year.
   * @param {TimeFrame} type - The timeFrame type to switch to.
   * @returns {void}
   */
  async changeSegment(type: TimeFrame): Promise<void> {
    if (type) {
      this.timeFrame = type;
    } else {
      this.timeFrame = this.timeFrame === 'month' ? 'year' : 'month';
    }

    // Actualizar datos cuando cambie de timeFrame
    if (this.measuresConfig?.historical) {
      await this.initializeVariables(this.measuresConfig.historical);
    }

    if (this.timeFrame === 'month' && this.typeView == 'chart') {
      if (this.measureSelected) {
        await this.updateChart(this.measureSelected.graph);
      }
    }
    this.ref.detectChanges();
  }

  /**
   * Sets the current month for displaying data and updates the calendar component.
   * @param {number} index - The index of the month to display.
   * @returns {Promise<void>}
   */
  async setCurrentMonth(index: number): Promise<void> {
    if (index === this.currentMonthIndex) {
      return;
    }
    if (index < 0 || index > 11) {
      if (index < 0) {
        index = 11;
        this.currentYearIndex -= 1;
      }
      if (index > 11) {
        if (this.currentYearIndex >= this.realCurrentYear) {
          return;
        }
        index = 0;
        this.currentYearIndex += 1;
        await this.updateDataForYear();
      }
    }
    const month = this.completedTaskYear?.find(
      (historical) => historical.mes === index,
    );
    if (!month) {
      return;
    }
    // Si venimos de vista de año, cambiar a calendario
    if (this.timeFrame === 'year') {
      this.typeView = 'calendar';
      // Limpiar selecciones de variables al cambiar a calendario
      this.variables.forEach((variable) => {
        variable.selected = false;
      });
      this.measureSelected = undefined;
    }

    this.currentMonthIndex = index;
    this.completedTaskMonth = this.completedTaskYear?.find(
      (historical) => historical.mes === index,
    );
    this.timeFrame = 'month';
    await this.initializeRegisters();
    if (this.measuresConfig?.historical) {
      await this.initializeVariables(this.measuresConfig.historical);

      // Solo actualizar gráfico si ya estábamos en modo gráfico
      if (this.typeView === 'chart') {
        if (this.measureSelected) {
          this.measureSelected.selected = true;
          await this.updateChart(this.measureSelected.graph);
        } else {
          void this.changeColorChart(this.variables[0]);
        }
      }
    }

    setTimeout(() => {
      if (!this.calendarComponent) {
        return;
      }
      this.calendarComponent.generateCalendars();
      this.ref.detectChanges();
    }, 0.3 * 1000);
    this.ref.detectChanges();
  }

  /**
   * Updates the area chart component with the provided color settings for the selected measurement.
   * @param {Historical} measurement - The selected measurement for updating chart colors.
   * @returns {void}
   */
  async changeColorChart(measurement: Historical): Promise<void> {
    if (this.typeView === 'calendar') {
      // Si estamos en vista de calendario, cambiar a gráfico y seleccionar esta variable
      this.typeView = 'chart';
      this.variables.forEach((variable) => {
        variable.selected = false;
      });
      measurement.selected = true;
      this.measureSelected = measurement;

      // Esperar a que se renderice el componente antes de actualizar el gráfico
      setTimeout(() => {
        void (async () => {
          if (this.areaChartComponent) {
            await this.updateChart(measurement.graph);
          }
        })();
      }, 100);
    } else if (this.typeView === 'chart') {
      if (measurement.selected) {
        return;
      }
      this.variables.forEach((variable) => {
        variable.selected = false;
      });
      measurement.selected = true;
      if (!this.areaChartComponent) {
        return;
      }
      this.measureSelected = measurement;
      await this.updateChart(measurement.graph);
    }
    this.ref.detectChanges();
  }

  /**
   * Navigates to the detail page for a selected calendar entry if it is not in the future.
   * @param {calendar | null} $event - The selected calendar entry event data.
   * @returns {Promise<void>}
   */
  async goToDetail($event: calendar | null): Promise<void> {
    if (!$event || $event.state === 'future') {
      return;
    }
    await this.router.navigate(['measurement-detail'], {
      queryParams: { ...$event, origin: 'history' },
    });
  }

  /**
   * Changes the year for displaying data.
   * @param {number} direction - The direction to change the year (1 for next year, -1 for previous year).
   * @returns {void}
   */
  changeYear(direction: number): void {
    this.currentYearIndex += direction;
    void this.updateDataForYear();
  }

  /**
   * Determines if the next year button is disabled.
   * @returns {boolean} - True if the next year button is disabled, false otherwise.
   */
  isNextYearDisabled(): boolean {
    return this.currentYearIndex + 1 > this.realCurrentYear;
  }

  /**
   * Updates data for the selected year.
   * @returns {Promise<void>}
   */
  async updateDataForYear(): Promise<void> {
    await this.initializeRegisters();
    await this.initializeCompletedTasks();
    if (this.measuresConfig?.historical) {
      await this.initializeVariables(this.measuresConfig.historical);
    }
  }
  /**
   * Updates the area chart with data based on the provided graph configuration.
   * @param {Graph} configGraph - Configuration object for the chart.
   * @returns {Promise<void>} Resolves once the chart is updated.
   */
  private async updateChart(configGraph: Graph): Promise<void> {
    const measuresMonth = await MeasurementDSService.getMeasurementsByMont(
      this.currentYearIndex,
      this.currentMonthIndex,
    );
    const transformedData = this.transformData(measuresMonth);
    const rangeMeasurement = this.calculateRangeOfMeasurement(
      configGraph.measurementIds,
    );

    // Crear las fechas de inicio y fin del mes
    const startOfMonth = new Date(
      this.currentYearIndex,
      this.currentMonthIndex,
      1,
      0,
      0,
      0,
      0,
    ).toLocaleDateString('en-CA');
    const endOfMonth = new Date(
      this.currentYearIndex,
      this.currentMonthIndex + 1,
      0,
      23,
      59,
      59,
      999,
    ).toLocaleDateString('en-CA');

    if (
      configGraph.type === 'line' &&
      configGraph.aggregationFunction === 'mean'
    ) {
      // Modo detallado para gráficas de línea con promedio
      const detailedMeasures = this.calculateDetailedMeasurement(
        transformedData,
        configGraph.measurementIds,
      );

      if (detailedMeasures && Object.keys(detailedMeasures).length > 0) {
        const labels = Object.keys(detailedMeasures).sort();
        const avgData = labels.map((date) => detailedMeasures[date]?.avg || 0);
        const minData = labels.map((date) => detailedMeasures[date]?.min || 0);
        const maxData = labels.map((date) => detailedMeasures[date]?.max || 0);

        this.areaChartComponent.UpdateChart(
          labels,
          avgData,
          configGraph.style.backgroundColor.colorHex,
          configGraph.style.borderColor.colorHex,
          'line',
          rangeMeasurement.min,
          rangeMeasurement.max,
          startOfMonth,
          endOfMonth,
          true, // detailedMode
          minData,
          maxData,
        );
      } else {
        this.areaChartComponent.UpdateChart(
          [],
          [],
          configGraph.style.backgroundColor.colorHex,
          configGraph.style.borderColor.colorHex,
          'line',
          rangeMeasurement.min,
          rangeMeasurement.max,
          startOfMonth,
          endOfMonth,
          false,
        );
      }
    } else {
      // Modo normal para gráficas de barras o suma
      const measures = this.calculateMeasurement(
        transformedData,
        configGraph.measurementIds,
        configGraph.aggregationFunction === 'sum' ? 'sum' : 'mean',
      );

      if (measures) {
        this.areaChartComponent.UpdateChart(
          Object.keys(measures),
          Object.values(measures),
          configGraph.style.backgroundColor.colorHex,
          configGraph.style.borderColor.colorHex,
          configGraph.type === 'line' ? 'line' : 'bar',
          rangeMeasurement.min,
          rangeMeasurement.max,
          startOfMonth,
          endOfMonth,
          false, // detailedMode
        );
      } else {
        this.areaChartComponent.UpdateChart(
          [],
          [],
          configGraph.style.backgroundColor.colorHex,
          configGraph.style.borderColor.colorHex,
          configGraph.type === 'line' ? 'line' : 'bar',
          rangeMeasurement.min,
          rangeMeasurement.max,
          startOfMonth,
          endOfMonth,
          false,
        );
      }
    }
  }
  /**     Metodos privados */
  /**
   * Initializes the number of registers.
   * @returns {Promise<void>}
   */
  private async initializeRegisters(): Promise<void> {
    this.nRegisters = await UserProgressDSService.getCountTasksByMonthYear(
      this.currentYearIndex,
      this.currentMonthIndex + 1,
    );
  }

  /**
   * Initializes the completed tasks data for the year and the current month.
   * @returns {Promise<void>}
   */
  private async initializeCompletedTasks(): Promise<void> {
    this.completedTaskYear = [];

    const tasksPromises = Array.from({ length: 12 }, (_, month) =>
      this.getCompletedTaskForMonth(this.currentYearIndex, month + 1),
    );

    this.completedTaskYear = await Promise.all(tasksPromises);

    this.completedTaskMonth = this.completedTaskYear.find(
      (historical) => historical.mes === new Date().getMonth(),
    );
  }

  /**
   * Fetches and formats completed tasks for a specific month.
   * @param {number} year - The year for which tasks are fetched.
   * @param {number}  month - The month for which tasks are fetched.
   * @returns {Promise<CompleteTaskHistorical>} CompleteTaskHistorical
   */
  private async getCompletedTaskForMonth(
    year: number,
    month: number,
  ): Promise<CompleteTaskHistorical> {
    const completedTask =
      await UserProgressDSService.getCompletedTasksByMonthYear(year, month, 3);

    return {
      mes: month - 1,
      date: new Date(year, month - 1, 1),
      name: this.monthsNames[month - 1],
      daysComplete: completedTask.daysComplete,
      daysIncomplete: completedTask.daysIncomplete,
      daysSaveStreak: completedTask.daysSaveStreak,
    };
  }

  /**
   * Initializes the historical variables based on configuration and measurement data.
   * @param {Historical[]} historicalData - The historical configuration data.
   * @returns {Promise<void>} void
   */
  private async initializeVariables(
    historicalData: Historical[],
  ): Promise<void> {
    let measurementValues: any[];

    if (this.timeFrame === 'year') {
      // Para vista de año, obtener datos de todo el año
      const startDate = new Date(this.currentYearIndex, 0, 1); // 1 de enero
      const endDate = new Date(this.currentYearIndex, 11, 31, 23, 59, 59); // 31 de diciembre
      measurementValues = await MeasurementDSService.getMeasurementsByDateRange(
        startDate,
        endDate,
      );
    } else {
      // Para vista de mes, obtener datos del mes específico
      measurementValues = await MeasurementDSService.getMeasurementsByMont(
        this.currentYearIndex,
        this.currentMonthIndex,
      );
    }

    const transformedData = this.transformData(measurementValues);

    this.variables = historicalData.map((measurement) => {
      const existingVariable = this.variables?.find(
        (variable) => variable.name === measurement.name,
      );
      const stats = this.calculateOverallStats(measurement, transformedData);
      return {
        name: measurement.name,
        symbol: measurement.symbol,
        unit: measurement.unit,
        measurementIds: measurement.measurementIds,
        aggregationFunction: measurement.aggregationFunction,
        style: measurement.style,
        graph: measurement.graph,
        selected: existingVariable?.selected ?? false, //deberia tener eel mismo valor que teiene this.variables y si no tiene entonces false
        value: this.calculateValue(measurement, transformedData),
        min: stats.min,
        max: stats.max,
        avg: stats.avg,
      };
    }) as Historical[];
  }

  /**
   * Calculates the value for a measurement based on its aggregation function.
   * @param {Historical} measurement - The measurement configuration.
   * @param {HistoricalMeasurement} values - The transformed measurement data.
   * @returns {number | undefined} The calculated value for the measurement.
   */
  private calculateValue(
    measurement: Historical,
    values: HistoricalMeasurement,
  ): number | undefined {
    switch (measurement.aggregationFunction) {
      case 'sum':
        return measurement.measurementIds.length > 0
          ? this.sum(values[measurement.measurementIds[0]])
          : undefined;
      case 'mean':
        return measurement.measurementIds.length > 1
          ? this.mean(
              values[measurement.measurementIds[0]],
              values[measurement.measurementIds[1]],
            )
          : undefined;
      default:
        return undefined;
    }
  }

  /**
   * Sums the values in the provided data.
   * @param {MeasurementEntry[]} data - The data to sum.
   * @returns {number | undefined} The sum of the values.
   */
  private sum(data: MeasurementEntry[]): number | undefined {
    // Sumar los valores
    if (!data) {
      return undefined;
    }
    const total = data.reduce((sum, item) => {
      // Extraer el valor de cada objeto (que tiene la fecha como clave)
      if (item) {
        const value = Object.values(item)[0];
        return sum + value;
      }
      return sum;
    }, 0);

    // Calcular el promedio
    return Math.round(total);
  }
  /**
   *  Calculeates mean of values in list1 and list2
   * @param {MeasurementEntry[]} list1 Input one
   * @param {MeasurementEntry[]} list2 Input two
   * @returns {number} mean Calculated
   */
  private mean(
    list1: MeasurementEntry[],
    list2: MeasurementEntry[],
  ): number | undefined {
    if (!list1 || !list2) {
      return undefined;
    }
    const sum1 = this.sum(list1) || 0;
    const sum2 = this.sum(list2) || 0;
    const totalSum = sum1 + sum2;
    const totalCount = list1.length + list2.length;

    if (totalCount === 0) {
      return undefined;
    }

    return Math.round(totalSum / totalCount);
  }

  /**
   * Transform struct data informacion or measurements
   * @param {Measurement[]} initialData Measures of service
   * @returns {HistoricalMeasurement} Historical Measure type for graph
   */
  private transformData(initialData: Measurement[]): HistoricalMeasurement {
    const result: HistoricalMeasurement = {};

    for (const record of initialData) {
      const { data, ts } = record;

      if (data && typeof data === 'object') {
        for (const [key] of Object.entries(data)) {
          if (!result[key]) {
            result[key] = [];
          }
          result[key].push({ [ts]: data[key] });
        }
      }
    }

    // Sort the lists by timestamp (ts) for each key
    for (const key in result) {
      result[key] = result[key]
        .filter((entry) => entry !== undefined) // Exclude undefined entries
        .sort((a, b) => {
          const tsA = a ? parseInt(Object.keys(a)[0], 10) : 0;
          const tsB = b ? parseInt(Object.keys(b)[0], 10) : 0;
          return tsA - tsB; // Ascending order
        });
    }

    return result;
  }
  /**
   * Calculates the range of measurement values (min and max) for the specified keys.
   * @param {string[]} keys - The measurement keys.
   * @returns {{ min: number | undefined; max: number | undefined }} The min and max values.
   */
  private calculateRangeOfMeasurement(
    keys: string[], // Un arreglo de claves de HistoricalMeasurement
  ): { min: number | undefined; max: number | undefined } {
    let max: number | undefined;
    let min: number | undefined;

    // Iterar sobre todas las claves en 'keys'
    for (let key of keys) {
      const measureConfig = this.measuresConfig?.measurements[key];
      if (!measureConfig) {
        continue;
      } // Si no existe la configuración, saltar al siguiente

      const { max: currentMax, min: currentMin } = measureConfig.range;

      // Actualizar el valor máximo
      if (currentMax !== undefined) {
        if (max === undefined || currentMax > max) {
          max = currentMax;
        }
      }

      // Actualizar el valor mínimo
      if (currentMin !== undefined) {
        if (min === undefined || currentMin < min) {
          min = currentMin;
        }
      }
    }

    return { min, max };
  }

  /**
   * Calculates aggregated measurement values (sum or mean) for the specified keys from historical data.
   * Groups data by date (ignoring time) and performs the requested aggregation for each day.
   * @private
   * @param {HistoricalMeasurement} historicalData - The historical measurement data. Each key corresponds to a type of measurement
   * and contains an array of timestamped values.
   * @param {string[]} keys - An array of keys from `historicalData` to process.
   * @param {'sum' | 'mean'} calculationType - The type of aggregation to perform ('sum' or 'mean').
   * @returns {MeasurementEntry} - An object where each key is a date (in YYYY-MM-DD format) and its value is the aggregated result.
   */
  private calculateMeasurement(
    historicalData: HistoricalMeasurement,
    keys: string[], // Un arreglo de claves de HistoricalMeasurement
    calculationType: 'sum' | 'mean',
  ): MeasurementEntry {
    const result: MeasurementEntry = {};

    // Recorrer cada clave proporcionada en `keys`
    keys.forEach((key) => {
      if (historicalData[key]) {
        // Crear un objeto temporal para almacenar las mediciones agrupadas por fecha
        const dailyValues: Record<string, number[]> = {};

        // Agrupar las mediciones por fecha (ignorando la hora)
        historicalData[key].forEach((entry) => {
          for (const timestamp in entry) {
            const date = timestamp.split('T')[0]; // Extraemos la fecha (YYYY-MM-DD)

            if (!dailyValues[date]) {
              dailyValues[date] = [];
            }

            dailyValues[date].push(entry[timestamp]);
          }
        });

        // Calcular la suma o la media diaria, dependiendo del tipo de cálculo
        for (const date in dailyValues) {
          const values = dailyValues[date];
          if (calculationType === 'sum') {
            // Sumar los valores para esa fecha
            const sum = values.reduce((acc, val) => acc + val, 0);
            result[date] = sum;
          } else if (calculationType === 'mean') {
            // Calcular la media de los valores para esa fecha
            const mean =
              values.reduce((acc, val) => acc + val, 0) / values.length;
            result[date] = mean;
          }
        }
      }
    });

    return result;
  }

  /**
   * Calculates detailed daily statistics (average, min, max) for the specified keys from historical data.
   * Groups data by date (ignoring time) and calculates avg, min, max for each day.
   * @private
   * @param {HistoricalMeasurement} historicalData - The historical measurement data.
   * @param {string[]} keys - An array of keys from `historicalData` to process.
   * @returns {DetailedMeasurementEntry} - An object where each key is a date and its value contains {avg, min, max}.
   */
  private calculateDetailedMeasurement(
    historicalData: HistoricalMeasurement,
    keys: string[],
  ): DetailedMeasurementEntry {
    const result: Record<string, DailyStats> = {};

    // Recorrer cada clave proporcionada en `keys`
    keys.forEach((key) => {
      if (historicalData[key]) {
        // Crear un objeto temporal para almacenar las mediciones agrupadas por fecha
        const dailyValues: Record<string, number[]> = {};

        // Agrupar las mediciones por fecha (ignorando la hora)
        historicalData[key].forEach((entry) => {
          for (const timestamp in entry) {
            const date = timestamp.split('T')[0]; // Extraemos la fecha (YYYY-MM-DD)

            if (!dailyValues[date]) {
              dailyValues[date] = [];
            }

            dailyValues[date].push(entry[timestamp]);
          }
        });

        // Calcular estadísticas diarias (avg, min, max)
        for (const date in dailyValues) {
          const values = dailyValues[date];
          if (values.length > 0) {
            const avg =
              values.reduce((acc, val) => acc + val, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            result[date] = { avg, min, max };
          }
        }
      }
    });

    return result;
  }

  /**
   * Calculates overall statistics (min, max, avg) for a measurement across all detailed data.
   * @private
   * @param {Historical} measurement - The measurement configuration.
   * @param {HistoricalMeasurement} transformedData - The transformed measurement data.
   * @returns {{ min: number | undefined; max: number | undefined; avg: number | undefined }} The calculated statistics.
   */
  private calculateOverallStats(
    measurement: Historical,
    transformedData: HistoricalMeasurement,
  ): {
    min: number | undefined;
    max: number | undefined;
    avg: number | undefined;
  } {
    if (
      measurement.aggregationFunction === 'mean' &&
      measurement.graph.type === 'line'
    ) {
      // Para gráficas de línea con promedio, usar estadísticas detalladas
      const detailedMeasures = this.calculateDetailedMeasurement(
        transformedData,
        measurement.measurementIds,
      );

      if (detailedMeasures && Object.keys(detailedMeasures).length > 0) {
        const dailyStats = Object.values(detailedMeasures);
        const mins = dailyStats.map((stats) => stats.min);
        const maxs = dailyStats.map((stats) => stats.max);
        const avgs = dailyStats.map((stats) => stats.avg);

        return {
          min: mins.length > 0 ? Math.min(...mins) : undefined,
          max: maxs.length > 0 ? Math.max(...maxs) : undefined,
          avg:
            avgs.length > 0
              ? avgs.reduce((sum, avg) => sum + avg, 0) / avgs.length
              : undefined,
        };
      }
    } else {
      // Para otros tipos de gráficas, usar los datos calculados normalmente
      const measures = this.calculateMeasurement(
        transformedData,
        measurement.measurementIds,
        measurement.aggregationFunction === 'sum' ? 'sum' : 'mean',
      );

      if (measures) {
        const values = Object.values(measures);
        const total =
          values.length > 0 ? values.reduce((sum, val) => sum + val, 0) : 0;
        return {
          min: values.length > 0 ? Math.min(...values) : undefined,
          max: values.length > 0 ? Math.max(...values) : undefined,
          avg:
            measurement.aggregationFunction === 'sum'
              ? total
              : values.length > 0
                ? total / values.length
                : undefined,
        };
      }
    }

    return { min: undefined, max: undefined, avg: undefined };
  }

  /**
   * Button click handler with early logging
   * @returns {void}
   */
  onShareButtonClick(): void {
    try {
      void this.shareMonthlyReport();
    } catch (syncError) {
      console.error(
        '[ShareReport] Button Click - Synchronous error:',
        syncError,
      );
    }
  }

  /**
   * Shares the current month's environmental data as an image report
   * @returns {Promise<void>}
   */
  async shareMonthlyReport(): Promise<void> {
    // Create alternative loading feedback for Android compatibility
    let loading: any = null;
    let showingAlternativeLoader = false;

    try {
      // Try LoadingController with very short timeout
      const loadingPromise = this.loadingController.create({
        message: 'Generando reporte...',
        duration: 45000,
      });

      const timeoutPromise = new Promise(
        (_, reject) =>
          setTimeout(
            () => reject(new Error('LoadingController timeout')),
            2000,
          ), // Shorter timeout
      );

      loading = await Promise.race([loadingPromise, timeoutPromise]);
    } catch (loadingError) {
      console.warn(
        '[ShareReport] Pre-Step 0.3: LoadingController failed, using alternative feedback:',
        loadingError,
      );

      // Show alternative loading feedback
      this.showAlternativeLoader('Generando imagen del reporte...');
      showingAlternativeLoader = true;
    }

    try {
      if (loading) {
        await loading.present();
      } else {
        console.error(
          '[ShareReport] Step 1: Using alternative loader, skipping present',
        );
      }

      // Check if sharing is available first with timeout
      const canSharePromise = this.shareService.canShare();
      const timeoutPromise = new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error('canShare timeout')), 5000),
      );

      let canShare: boolean;
      try {
        canShare = await Promise.race([canSharePromise, timeoutPromise]);
      } catch (error) {
        console.error(
          '[ShareReport] Step 4: Share capability check failed/timeout:',
          error,
        );
        // Assume sharing is available and continue
        canShare = true;
      }

      if (!canShare) {
        await loading.dismiss();
        console.warn('[ShareReport] Share not available on this platform');

        const toast = await this.toastController.create({
          message:
            'La función de compartir no está disponible en este dispositivo',
          duration: 3000,
          position: 'bottom',
          color: 'warning',
        });
        await toast.present();
        return;
      }

      // Create month string for filename
      const monthStr = `${this.monthsNames[this.currentMonthIndex]} ${this.currentYearIndex}`;

      // Generate the report image with error handling
      let imageDataUrl: string;

      try {
        // Update loader message
        if (showingAlternativeLoader) {
          this.updateAlternativeLoader('Procesando datos...');
        }

        // Add timeout for image generation
        const imagePromise =
          this.environmentalReportService.generateReportImage(
            this.currentYearIndex,
            this.currentMonthIndex,
          );
        const imageTimeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(
            () => reject(new Error('Image generation timeout')),
            30000,
          ),
        );

        imageDataUrl = await Promise.race([imagePromise, imageTimeoutPromise]);
      } catch (imageError) {
        console.error(
          '[ShareReport] Step 9: Image generation failed/timeout:',
          imageError,
        );

        // Dismiss loader
        if (loading) {
          await loading.dismiss();
        } else if (showingAlternativeLoader) {
          this.hideAlternativeLoader();
        }

        // Fallback: Try to share text data instead
        await this.shareReportAsText(monthStr);
        return;
      }

      // Update loader message
      if (showingAlternativeLoader) {
        this.updateAlternativeLoader('Preparando imagen...');
      }

      // Dismiss loading
      if (loading) {
        await loading.dismiss();
      } else if (showingAlternativeLoader) {
        this.hideAlternativeLoader();
      }

      // Share the image with retry logic
      try {
        await this.shareService.shareReportImage(imageDataUrl, monthStr);

        // Show success toast
        const toast = await this.toastController.create({
          message: 'Reporte compartido exitosamente',
          duration: 2000,
          position: 'bottom',
          color: 'success',
        });
        await toast.present();
      } catch (shareError) {
        console.error(
          '[ShareReport] Share failed, trying text fallback:',
          shareError,
        );

        // Fallback: Share as text if image sharing fails
        await this.shareReportAsText(monthStr);
      }
    } catch (error) {
      // Cleanup any loaders
      if (loading) {
        await loading.dismiss();
      } else if (showingAlternativeLoader) {
        this.hideAlternativeLoader();
      }

      console.error(
        '[ShareReport] Unexpected error in shareMonthlyReport:',
        error,
      );

      // Create month string for fallback
      const monthStr = `${this.monthsNames[this.currentMonthIndex]} ${this.currentYearIndex}`;

      // Try text fallback as last resort
      try {
        await this.shareReportAsText(monthStr);
      } catch (fallbackError) {
        console.error(
          '[ShareReport] Even text fallback failed:',
          fallbackError,
        );

        // Show error toast
        const toast = await this.toastController.create({
          message: 'Error al compartir el reporte. Intenta de nuevo.',
          duration: 3000,
          position: 'bottom',
          color: 'danger',
        });
        await toast.present();
      }
    }
  }

  /**
   * Fallback method to share report data as text when image generation fails
   * @param {string} monthStr - The month string for the report
   * @returns {Promise<void>}
   */
  private async shareReportAsText(monthStr: string): Promise<void> {
    try {
      // Generate summary text from current variables data
      let reportText = `📊 Reporte de Datos Ambientales - ${monthStr}\n\n`;

      if (this.variables && this.variables.length > 0) {
        reportText += '📈 Resumen del mes:\n';

        this.variables.forEach((variable, index) => {
          if (variable.avg !== undefined) {
            reportText += `• ${variable.name}: ${variable.avg.toFixed(1)}${variable.unit}`;
            if (variable.min !== undefined && variable.max !== undefined) {
              reportText += ` (Min: ${variable.min.toFixed(1)}, Max: ${variable.max.toFixed(1)})`;
            }
            reportText += '\n';
          }
        });
      } else {
        reportText += '📈 No hay datos disponibles para este mes\n';
      }

      if (this.nRegisters) {
        reportText += `\n📝 Total de registros: ${this.nRegisters}`;
      }

      reportText += '\n\n🌱 Generado con App UVA';

      await this.shareService.shareText(
        `Reporte de Datos Ambientales - ${monthStr}`,
        reportText,
      );

      // Show success toast with note about text format
      const toast = await this.toastController.create({
        message: 'Reporte compartido como texto (imagen no disponible)',
        duration: 3000,
        position: 'bottom',
        color: 'warning',
      });
      await toast.present();
    } catch (error) {
      console.error('[ShareReport] Text Fallback - Error occurred:', error);
      throw error;
    }
  }

  /**
   * Simplified direct text sharing without complex dependencies
   * @returns {Promise<void>}
   */
  private async shareReportAsTextDirect(): Promise<void> {
    try {
      const monthStr = `${this.monthsNames[this.currentMonthIndex]} ${this.currentYearIndex}`;

      let reportText = `📊 Reporte de Datos Ambientales - ${monthStr}\n\n`;

      // Add basic info without complex data processing
      reportText += '📈 Datos del mes recopilados\n';
      reportText += `📅 Período: ${monthStr}\n`;

      // Try to add variables data if available
      if (this.variables && this.variables.length > 0) {
        reportText += '\n📊 Mediciones:\n';
        this.variables.forEach((variable, index) => {
          if (variable.avg !== undefined) {
            reportText += `• ${variable.name}: ${variable.avg.toFixed(1)}${variable.unit}\n`;
          }
        });
      }

      if (this.nRegisters) {
        reportText += `\n📝 Total de registros: ${this.nRegisters}`;
      }

      reportText += '\n\n🌱 Generado con App UVA';

      // Use platform-specific sharing

      if ((window as any).Capacitor) {
        try {
          const { Share } = await import('@capacitor/share');

          await Share.share({
            title: `Reporte de Datos Ambientales - ${monthStr}`,
            text: reportText,
          });
        } catch (shareError) {
          console.error(
            '[ShareReport] Direct Text Share - Capacitor share failed:',
            shareError,
          );
          // Fallback to clipboard
          throw shareError;
        }
      } else {
        if (navigator.share) {
          await navigator.share({
            title: `Reporte de Datos Ambientales - ${monthStr}`,
            text: reportText,
          });
        } else {
          // Copy to clipboard as fallback
          await navigator.clipboard.writeText(reportText);
          alert('Reporte copiado al portapapeles');
        }
      }

      // Show success message with toast timeout
      try {
        const toast = await this.toastController.create({
          message: 'Reporte compartido exitosamente',
          duration: 2000,
          position: 'bottom',
          color: 'success',
        });
        await toast.present();
      } catch (toastError) {
        console.warn(
          '[ShareReport] Direct Text Share - Toast failed, but share was successful:',
          toastError,
        );
      }
    } catch (error) {
      console.error('[ShareReport] Direct Text Share - Error occurred:', error);

      // Show error message
      try {
        const toast = await this.toastController.create({
          message: 'Error al compartir reporte',
          duration: 3000,
          position: 'bottom',
          color: 'danger',
        });
        await toast.present();
      } catch (toastError) {
        console.error(
          '[ShareReport] Direct Text Share - Even error toast failed:',
          toastError,
        );
        // Last resort: alert
        alert('Error al compartir reporte. Intenta de nuevo.');
      }
    }
  }

  /**
   * Shows alternative loading feedback when LoadingController fails
   * @param {string} message - The message to display
   */
  private showAlternativeLoader(message: string): void {
    // Create overlay element
    const overlay = document.createElement('div');
    overlay.id = 'alternative-loader-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    `;

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.id = 'alternative-loader-message';
    messageElement.textContent = message;
    messageElement.style.cssText = `
      font-size: 16px;
      text-align: center;
      max-width: 80%;
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    overlay.appendChild(spinner);
    overlay.appendChild(messageElement);
    document.body.appendChild(overlay);
  }

  /**
   * Updates the message of the alternative loader
   * @param {string} message - The new message to display
   */
  private updateAlternativeLoader(message: string): void {
    const messageElement = document.getElementById(
      'alternative-loader-message',
    );
    if (messageElement) {
      messageElement.textContent = message;
    }
  }

  /**
   * Hides the alternative loader
   */
  private hideAlternativeLoader(): void {
    const overlay = document.getElementById('alternative-loader-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Checks if sharing is available on the current platform
   * @returns {Promise<boolean>} True if sharing is supported
   */
  async canShareReport(): Promise<boolean> {
    return await this.shareService.canShare();
  }
}
