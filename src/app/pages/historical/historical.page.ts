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
  IonSegment,
  IonSegmentButton,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { AreachartComponent } from '@app/components/areachart/areachart.component';
import { Router } from '@angular/router';
import { Historical } from 'src/models/configuration/measurements.model';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { MeasurementDSService } from '@app/core/services/storage/datastore/measurement-ds.service';
import {
  CompletedTask,
  UserProgressDSService,
} from '@app/core/services/storage/datastore/user-progress-ds.service';

import { Measurement } from 'src/models';

interface historical {
  mes: number;
  date: Date;
  name: string;
  daysComplete: number[];
  daysIncomplete: number[];
}
type MeasurementEntry = Record<string, number>; // Mapea timestamps a valores numéricos

type HistoricalMeasurement = Record<string, MeasurementEntry[]>;

export const monthsNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
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
    IonSegment,
    IonSegmentButton,
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
  segment: 'mes' | 'año' = 'mes';
  modeData: 'calendar' | 'chart' = 'calendar';

  currentYear = new Date().getFullYear();
  variables: Historical[] = [];
  historical: historical[] = [];
  currentMonth: historical | undefined;

  currentMonthIndex: number = new Date().getMonth();
  monthsNames = monthsNames;
  totalTask: number | undefined;
  @ViewChild(CalendarComponent) calendarComponent!: CalendarComponent;
  @ViewChild(AreachartComponent) areaChartComponent!: AreachartComponent;

  /**
   * Initializes component with router and change detector.
   * @param {Router} router - Provides navigation between pages.
   * @param {ChangeDetectorRef} ref - Detects changes in component data.
   */
  constructor(
    private router: Router,
    private ref: ChangeDetectorRef,
    private configuration: ConfigurationAppService,
  ) {}

  /**
   * OnInit lifecycle hook. Sets the initial state of the historical and measurement data.
   * @returns {void}
   */
  async ngOnInit(): Promise<void> {
    const data = await this.configuration.getConfigurationMeasurement();
    this.totalTask = await UserProgressDSService.getCountTasksByMonthYear(
      2024,
      11,
    );

    this.historical = []; // Inicializa el array si no está definido aún.

    for (let month = 0; month < 12; month++) {
      const completedTask =
        await UserProgressDSService.getCompletedTasksByMonthYear(
          2024,
          month + 1,
          3,
        );

      this.historical[month] = {
        mes: month,
        date: new Date(2024, month, 1),
        name: this.monthsNames[month],
        daysComplete: completedTask.daysComplete,
        daysIncomplete: completedTask.daysIncomplete,
      };
    }
    console.log(this.historical);
    //this.historical = _data.historical;
    this.currentMonth = this.historical.find(
      (historical) => historical.mes === new Date().getMonth(),
    );

    if (data?.historical) {
      const measurementvalues =
        await MeasurementDSService.getMeasurementsByMont(
          this.currentYear,
          this.currentMonthIndex,
        );
      const values = this.transformData(measurementvalues);
      const configurationVariables = data.historical.map((measurement) => {
        let value: number | undefined;
        switch (measurement.aggregationFunction) {
          case 'sum':
            if (measurement.measurementIds.length > 0) {
              value = this.sum(values[measurement.measurementIds[0]]);
            }

            break;
          case 'mean':
            if (measurement.measurementIds.length > 1) {
              value = this.mean(
                values[measurement.measurementIds[0]],
                values[measurement.measurementIds[1]],
              );
            }
            break;
          default:
            break;
        }
        return {
          name: measurement.name,
          symbol: measurement.symbol,
          unit: measurement.unit,
          measurementIds: measurement.measurementIds,
          aggregationFunction: measurement.aggregationFunction,
          style: measurement.style,
          graph: measurement.graph,
          value: value,
        };
      }) as Historical[];
      this.variables = configurationVariables;
      console.log(this.variables);
    }
  }

  /**
   * Toggles the view mode between calendar and chart.
   * @returns {void}
   */
  changeModeData(): void {
    this.modeData = this.modeData === 'calendar' ? 'chart' : 'calendar';
    this.ref.detectChanges();
  }

  /**
   * Changes the segment view between month and year.
   * @param {'mes' | 'año'} type - The segment type to switch to.
   * @returns {void}
   */
  changeSegment(type: 'mes' | 'año'): void {
    if (type) {
      this.segment = type;
    } else {
      this.segment = this.segment === 'mes' ? 'año' : 'mes';
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
    const month = this.historical.find(
      (historical) => historical.mes === index,
    );
    if (!month) {
      return;
    }
    // this.modeData = 'calendar';
    this.currentMonthIndex = index;
    this.currentMonth = this.historical.find(
      (historical) => historical.mes === index,
    );
    this.segment = 'mes';

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

  sum(data: MeasurementEntry[]): number {
    // Sumar los valores
    const total = data.reduce((sum, item) => {
      // Extraer el valor de cada objeto (que tiene la fecha como clave)
      const value = Object.values(item)[0];
      return sum + value;
    }, 0);

    // Calcular el promedio
    return Math.round(total);
  }
  mean(list1: MeasurementEntry[], list2: MeasurementEntry[]): number {
    const totalSum = this.sum(list1) + this.sum(list2);
    const totalCount = list1.length + list2.length;
    return totalCount > 0 ? Math.round(totalSum / totalCount) : 0;
  }

  transformData(initialData: Measurement[]): HistoricalMeasurement {
    const result: HistoricalMeasurement = {};

    for (const record of initialData) {
      const { data, ts } = record;
      if (data && typeof data == 'object') {
        for (const [key, value] of Object.entries(data)) {
          if (!result[key]) {
            result[key] = [];
          }
          result[key].push({ [ts]: data[key] });
        }
      }

      /*
      }*/
    }

    return result;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
/*const _data: any = {
  measurements: {
    TEMPERATURA_MIN: {
      name: 'Temperatura minima',
      sortName: 'temperatura min',
      value: '31',
      icon: {
        enable: true,
        iconName: 'arrow-narrow-down',
        colorName: '',
        colorHex: '#D92424',
        icon: '🌡️',
      },
      fields: 2,
      unit: '°C',
      range: {
        min: 16,
        max: 38,
        optionalMessage: '',
      },
      backgroundColor: {
        colorName: 'Colors-Orange-50',
        colorHex: '#FDF9EF',
      },
      borderColor: {
        colorName: 'Colors-Orange-200',
        colorHex: '#F7DFB1',
      },
    },
    TEMPERATURA_MAX: {
      name: 'Temperatura máxima',
      sortName: 'temperatura max',
      value: '42',

      icon: {
        enable: true,
        name: 'arrow-narrow-up',
        color: 'Colors-Green-400',
        colorHex: '#85C259',
        imagePath: 'racimos/NAT001/measurementRegistration/icons/icon_max.svg',
        icon: '🌡️',
      },
      fields: 2,
      unit: '°C',
      range: {
        min: 16,
        max: 38,
        optionalMessage: 'Verifica que tu termohigrómetro esté en °C.',
      },
      backgroundColor: {
        colorName: 'Colors-Orange-50',
        colorHex: '#FDF9EF',
      },
      borderColor: {
        colorName: 'Colors-Orange-200',
        colorHex: '#F7DFB1',
      },
    },
    HUMEDAD_MIN: {
      name: 'Humedad minima',
      sortName: 'humedad min',
      value: '10',
      icon: {
        enable: true,
        iconName: 'arrow-narrow-down',
        colorName: '',
        colorHex: '#D92424',
        imagePath: 'racimos/NAT001/measurementRegistration/icons/icon_min.svg',
        icon: '💧',
      },
      fields: 2,
      unit: '%',
      range: {
        min: 40,
        max: 100,
        optionalMessage: '',
      },
      backgroundColor: {
        colorName: 'Colors-Blue-50',
        colorHex: '#EDFEFE',
      },
      borderColor: {
        colorName: 'Colors-Blue-200',
        colorHex: '#A9F5F8',
      },
    },
  },
  historical: [
    {
      mes: 0,
      date: new Date(2024, 0, 1),
      name: 'Enero',
      daysComplete: [24, 25, 26, 27, 28, 29, 30, 31],
      daysIncomplete: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19],
    },
    {
      mes: 1,

      date: new Date(2024, 1, 1),
      name: 'Febrero',
      daysComplete: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 24, 25,
        26, 27, 28, 29, 30, 31,
      ],
      daysIncomplete: [13, 14, 15, 22, 23],
    },
    {
      mes: 2,
      name: 'Marzo',
      date: new Date(2024, 2, 1),
      daysComplete: [9, 10, 11, 12, 16, 17, 18],
      daysIncomplete: [19, 20, 21, 24],
    },
    {
      mes: 3,
      name: 'Abril',
      date: new Date(2024, 3, 1),
      daysComplete: [3, 4, 5, 6, 7, 8],
      daysIncomplete: [7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21],
    },
    {
      mes: 4,
      name: 'Mayo',
      date: new Date(2024, 4, 1),
      daysComplete: [8, 9, 10, 11, 12, 16, 17, 18, 19, 20],
      daysIncomplete: [4, 5, 6, 28, 29, 30, 31],
    },
    {
      mes: 5,
      name: 'Junio',
      date: new Date(2024, 5, 1),
      daysComplete: [24, 25, 26, 27, 28, 29, 30, 31],
      daysIncomplete: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19],
    },
    {
      mes: 6,
      name: 'Julio',
      date: new Date(2024, 6, 1),
      daysComplete: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 24, 25,
        26, 27, 28, 29, 30, 31,
      ],
      daysIncomplete: [13, 14, 15, 22, 23],
    },
    {
      mes: 7,
      name: 'Agosto',
      date: new Date(2024, 7, 1),
      daysComplete: [9, 10, 11, 12, 16, 17, 18],
      daysIncomplete: [19, 20, 21, 24],
    },
    {
      mes: 8,
      name: 'Septiembre',
      date: new Date(2024, 8, 1),
      daysComplete: [3, 4, 5, 6, 7, 8],
      daysIncomplete: [7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21],
    },
    {
      mes: 9,
      name: 'Octubre',
      date: new Date(2024, 9, 1),
      daysComplete: [8, 9, 10, 11, 12, 16, 17, 18, 19, 20],
      daysIncomplete: [4, 5, 6, 28, 29, 30, 31],
    },
    {
      mes: 10,
      name: 'Noviembre',
      date: new Date(2024, 10, 1),
      daysComplete: [3, 4, 5, 6, 7, 9, 10, 11, 12, 16, 17, 18],
      daysIncomplete: [19, 20, 21, 24],
    },
    {
      mes: 11,
      name: 'Diciembre',
      date: new Date(2024, 11, 1),
      daysComplete: [3, 4, 5, 6, 7, 8],
      daysIncomplete: [7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21],
    },
  ],
};
*/
