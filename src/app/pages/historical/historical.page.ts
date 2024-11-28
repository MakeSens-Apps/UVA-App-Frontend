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
  Historical,
  MeasurementModel,
} from 'src/models/configuration/measurements.model';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { MeasurementDSService } from '@app/core/services/storage/datastore/measurement-ds.service';
import {
  CompletedTask,
  UserProgressDSService,
} from '@app/core/services/storage/datastore/user-progress-ds.service';

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
  measuresConfig: MeasurementModel | undefined;
  measuresMonth: HistoricalMeasurement = {};
  measuresYear: HistoricalMeasurement[] = [{}];
  completedTaskMonth: CompleteTaskHistorical | undefined;
  completedTaskYear: CompleteTaskHistorical[] | undefined;
  measureSelected: Historical | undefined;
  currentMonthIndex: number = new Date().getMonth();
  currentYearIndex = new Date().getFullYear();

  variables: Historical[] = [];
  monthsNames = monthsNames;
  @ViewChild(CalendarComponent) calendarComponent!: CalendarComponent;
  @ViewChild(AreachartComponent) areaChartComponent!: AreachartComponent;

  /**
   * Initializes component with router and change detector.
   * @param {Router} router - Provides navigation between pages.
   * @param {ChangeDetectorRef} ref - Detects changes in component data.
   * @param {ConfigurationAppService} configuration
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
    const data = await this.configuration.getConfigurationMeasurement();
    if (data?.historical) {
      await this.initializeVariables(data.historical);
    }
  }

  onTimeFrameChange(event: TimeFrame): void {
    this.timeFrame = event;
    return;
  }

  /**
   * view about to enter
   */
  async ionViewWillEnter(): Promise<void> {
    const userprogress = await UserProgressDSService.getLastUserProgress();
    if (userprogress) {
      this.seed = userprogress.Seed;
    }
  }
  /**
   * Toggles the view mode between calendar and chart.
   * @returns {void}
   */
  changeModeData(): void {
    this.typeView = this.typeView === 'calendar' ? 'chart' : 'calendar';
    this.ref.detectChanges();
  }

  /**
   * Changes the timeFrame view between month and year.
   * @param {TimeFrame} type - The timeFrame type to switch to.
   * @returns {void}
   */
  changeSegment(type: TimeFrame): void {
    if (type) {
      this.timeFrame = type;
    } else {
      this.timeFrame = this.timeFrame === 'month' ? 'year' : 'month';
    }

    this.ref.detectChanges();
  }

  /**
   * Sets the current month for displaying data and updates the calendar component.
   * @param {number} index - The index of the month to display.
   * @returns {void}
   */
  setCurrentMonth(index: number): void {
    if (index === this.currentMonthIndex) {
      return;
    }
    if (index < 0 || index > 11) {
      return;
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
  changeColorChart(measurement: Historical): void {
    if (!this.areaChartComponent) {
      return;
    }

    this.areaChartComponent.UpdateChart(
      undefined,
      [100, 80, 80, 60, 30, 75, 100, 80],
      measurement.style.backgroundColor.colorHex,
      measurement.style.borderColor.colorHex,
      'bar',
    );
  }

  /**
   * Navigates to the detail page for a selected calendar entry if it is not in the future.
   * @param {calendar | null} $event - The selected calendar entry event data.
   * @returns {Promise<void>}
   */
  async goToDetail($event: calendar | null): Promise<void> {
    if (!$event || $event.state === 'future' || $event.state === 'normal') {
      return;
    }
    await this.router.navigate(['app/tabs/history/detail'], {
      queryParams: $event,
    });
  }

  /**     Metodos privados */
  /**
   * Initializes the number of registers.
   * @returns {Promise<void>}
   */
  private async initializeRegisters(): Promise<void> {
    this.nRegisters = await UserProgressDSService.getCountTasksByMonthYear(
      2024,
      11,
    );
  }

  /**
   * Initializes the completed tasks data for the year and the current month.
   * @returns {Promise<void>}
   */
  private async initializeCompletedTasks(): Promise<void> {
    this.completedTaskYear = [];

    const tasksPromises = Array.from({ length: 12 }, (_, month) =>
      this.getCompletedTaskForMonth(2024, month + 1),
    );

    this.completedTaskYear = await Promise.all(tasksPromises);

    this.completedTaskMonth = this.completedTaskYear.find(
      (historical) => historical.mes === new Date().getMonth(),
    );
  }

  /**
   * Fetches and formats completed tasks for a specific month.
   * @param year - The year for which tasks are fetched.
   * @param month - The month for which tasks are fetched.
   * @returns {Promise<CompleteTaskHistorical>}
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
   * @param historicalData - The historical configuration data.
   * @returns {Promise<void>}
   */
  private async initializeVariables(
    historicalData: Historical[],
  ): Promise<void> {
    const measurementValues = await MeasurementDSService.getMeasurementsByMont(
      this.currentYearIndex,
      this.currentMonthIndex,
    );

    const transformedData = this.transformData(measurementValues);

    this.variables = historicalData.map((measurement) => ({
      name: measurement.name,
      symbol: measurement.symbol,
      unit: measurement.unit,
      measurementIds: measurement.measurementIds,
      aggregationFunction: measurement.aggregationFunction,
      style: measurement.style,
      graph: measurement.graph,
      value: this.calculateValue(measurement, transformedData),
    })) as Historical[];

    console.log(this.variables);
  }

  /**
   * Calculates the value for a measurement based on its aggregation function.
   * @param {Historical} measurement - The measurement configuration.
   * @param {HistoricalMeasurement} values - The transformed measurement data.
   * @returns {number | undefined}
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

  private sum(data: MeasurementEntry[]): number {
    // Sumar los valores
    const total = data.reduce((sum, item) => {
      // Extraer el valor de cada objeto (que tiene la fecha como clave)
      const value = Object.values(item)[0];
      return sum + value;
    }, 0);

    // Calcular el promedio
    return Math.round(total);
  }
  private mean(list1: MeasurementEntry[], list2: MeasurementEntry[]): number {
    const totalSum = this.sum(list1) + this.sum(list2);
    const totalCount = list1.length + list2.length;
    return totalCount > 0 ? Math.round(totalSum / totalCount) : 0;
  }

  private transformData(initialData: Measurement[]): HistoricalMeasurement {
    const result: HistoricalMeasurement = {};

    for (const record of initialData) {
      const { data, ts } = record;
      if (data && typeof data == 'object') {
        for (const [key] of Object.entries(data)) {
          if (!result[key]) {
            result[key] = [];
          }
          result[key].push({ [ts]: data[key] });
        }
      }
    }

    return result;
  }
}
