import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { HeaderComponent } from '@app/components/header/header.component';
import { CommonModule } from '@angular/common';
import {
  calendar,
  CalendarComponent,
} from '@app/components/calendar/calendar.component';
import {
  IonCol,
  IonContent,
  IonGrid,
  IonLabel,
  IonRow,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AreachartComponent } from '@app/components/areachart/areachart.component';
import { Router } from '@angular/router';
import {
  Graph,
  Historical,
  MeasurementModel,
} from 'src/models/configuration/measurements.model';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { MeasurementDSService } from '@app/core/services/storage/datastore/measurement-ds.service';
import { UserProgressDSService } from '@app/core/services/storage/datastore/user-progress-ds.service';

import { Measurement } from 'src/models';
import {
  TimeFrame,
  CompleteTaskHistorical,
  HistoricalMeasurement,
  MeasurementEntry,
  monthsNames,
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
   */
  constructor(
    private router: Router,
    private ref: ChangeDetectorRef,
    private configuration: ConfigurationAppService,
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
    // this.typeView = 'calendar';
    this.currentMonthIndex = index;
    this.completedTaskMonth = this.completedTaskYear?.find(
      (historical) => historical.mes === index,
    );
    this.timeFrame = 'month';
    await this.initializeRegisters();
    if (this.measuresConfig?.historical) {
      await this.initializeVariables(this.measuresConfig.historical);
      if (this.measureSelected) {
        this.measureSelected.selected = true;
        await this.updateChart(this.measureSelected.graph);
      } else {
        await this.changeColorChart(this.variables[0]);
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
    if (this.typeView === 'chart') {
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
      queryParams: $event,
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
    const measures = this.calculateMeasurement(
      transformedData,
      configGraph.measurementIds,
      configGraph.aggregationFunction === 'sum' ? 'sum' : 'mean',
    );
    const rangeMeasurement = this.calculateRangeOfMeasurement(
      configGraph.measurementIds,
    );
    if (measures) {
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
      );
    } else {
      this.areaChartComponent.UpdateChart(
        [],
        [],
        configGraph.style.backgroundColor.colorHex,
        configGraph.style.borderColor.colorHex,
        configGraph.type === 'line' ? 'line' : 'bar',
      );
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
    const measurementValues = await MeasurementDSService.getMeasurementsByMont(
      this.currentYearIndex,
      this.currentMonthIndex,
    );

    const transformedData = this.transformData(measurementValues);

    this.variables = historicalData.map((measurement) => {
      const existingVariable = this.variables?.find(
        (variable) => variable.name === measurement.name,
      );
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
}
