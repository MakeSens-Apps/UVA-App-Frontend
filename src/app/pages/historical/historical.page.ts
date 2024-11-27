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
import { IMeasurement } from '../../Interfaces/IMeasurement';

interface historical {
  mes: number;
  date: Date;
  name: string;
  daysComplete: number[];
  daysIncomplete: number[];
}

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
  variables: IMeasurement[] = [];
  historical: historical[] = [];
  currentMonth: historical | undefined;

  currentMonthIndex: number = new Date().getMonth();
  monthsNames = monthsNames;
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
  ) {}

  /**
   * OnInit lifecycle hook. Sets the initial state of the historical and measurement data.
   * @returns {void}
   */
  ngOnInit(): void {
    this.historical = data.historical;
    this.currentMonth = this.historical.find(
      (historical) => historical.mes === new Date().getMonth(),
    );

    this.variables = Object.keys(data.measurements).map(
      (key: keyof typeof data.measurements) => {
        const measurement = data.measurements[key];
        return {
          name: measurement.name,
          unit: measurement.unit,
          value: measurement.value,
          icon: {
            enable: measurement.icon.enable,
            icon: measurement.icon.icon,
          },
          backgroundColor: {
            colorHex: measurement.backgroundColor.colorHex,
          },
          borderColor: {
            colorHex: measurement.borderColor.colorHex,
          },
        };
      },
    );
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
   * @param {IMeasurement} measurement - The selected measurement for updating chart colors.
   * @returns {void}
   */
  changeColorChart(measurement: IMeasurement): void {
    if (!this.areaChartComponent) {
      return;
    }

    this.areaChartComponent.UpdateChart(
      undefined,
      [100, 80, 80, 60, 30, 75, 100, 80],
      measurement.backgroundColor.colorHex,
      measurement.borderColor.colorHex,
      'bar'
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = {
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
