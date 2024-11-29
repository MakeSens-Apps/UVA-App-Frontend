import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  getDay,
  getDaysInMonth,
  startOfMonth,
  startOfWeek,
  isFuture,
  isToday,
} from 'date-fns';
import { DayComponent } from './day/day.component';
export interface calendar {
  /** The date object representing the day */
  date: Date | null;
  /** Day of the month (1-31) */
  dayOfMonth: number | null;
  /** Day of the week (0 = Sunday, 1 = Monday, etc.) */
  dayOfWeek: number | null;
  /** The state of the day, used to mark completion or status */
  state?:
    | 'today'
    | 'complete'
    | 'incomplete'
    | 'future'
    | 'normal'
    | 'none'
    | undefined;

  /** The icon to be displayed on the day */
  icon?: string | null;
}

/**
 * CalendarComponent - Displays a monthly or weekly calendar view.
 *
 * This component generates either a month or week view of the calendar,
 * displaying each day's state based on completion and other conditions.
 * @class
 */
@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  imports: [CommonModule, IonicModule, DayComponent],
  standalone: true,
})
export class CalendarComponent implements OnInit {
  /** Title of the component */
  @Input() title = 'Enero';

  /** Array representing the calendar days with their properties and states */
  calendar: calendar[] = [];

  /** Defines the type of calendar (e.g., moon or normal) */
  @Input() typeCalendar = 'normal';

  /**
   * Defines the calendar view mode.
   * Accepts 'month' for a full month view or 'week' for a weekly view.
   * @type {string}
   */
  @Input() calendarView = 'month';

  /**
   * Defines the calendar view mode.
   * Accepts 'month' for a full month view or 'week' for a weekly view.
   * @type {string}
   */
  @Input() IsMini = false;

  /**
   * Indicates whether the calendar includes a header.
   * @type {boolean}
   */
  @Input() hasHeader = false;
  /**
   * Indicates whether the calendar includes a header.
   * @type {boolean}
   */
  @Input() hasTitle = false;

  /** The date being viewed in the calendar */
  @Input() viewDate = new Date();

  /** Today's date (day of the month) */
  today = new Date().getDate();

  private _daysComplete: number[] = [];
  /** Days marked as completed */
  @Input()
  set daysComplete(value: number[]) {
    this._daysComplete = value;
    this.generateCalendars();
  }
  /**Get */
  get daysComplete(): number[] {
    return this._daysComplete;
  }

  /** Days marked as incomplete */
  private _daysIncomplete: number[] = [];

  @Input()
  /**Set */
  set daysIncomplete(value: number[]) {
    this._daysIncomplete = value;
    this.generateCalendars();
  }
  /**Get */
  get daysIncomplete(): number[] {
    return this._daysIncomplete;
  }

  @Output() dayClick = new EventEmitter<calendar | null>();

  private _phaseMoonDays: { day: number; status: string }[] = [];

  /**
   * Days phase calendar input property.
   * When the `phaseMoonDays` input is updated, the setter is triggered,
   * updating the private `_phaseMoonDays` property and calling the
   * `generateCalendars` function to render the updated phase calendar.
   * @type {{ day: number; status: string }[]} - An array of objects representing the day and its status in the moon phase calendar.
   */
  @Input()
  set phaseMoonDays(value: { day: number; status: string }[]) {
    this._phaseMoonDays = value;
    this.generateCalendars(); // Llamar a la función de renderización al actualizar phaseMoonDays
  }
  /**
   * Days phase calendar getter.
   * Returns the private `_phaseMoonDays` property containing the current moon phase calendar data.
   * @returns {{ day: number; status: string }[]} - The current array of moon phase calendar data.
   */
  get phaseMoonDays(): { day: number; status: string }[] {
    return this._phaseMoonDays;
  }

  icon = './../../../assets/images/icons/Moon/full.svg';

  /**
   * Lifecycle hook that initializes the calendar
   * @returns {void}
   */
  ngOnInit(): void {
    this.generateCalendars();
  }

  /**
   * Generate calendar based on the view mode.
   * Determines whether to generate a monthly or weekly calendar.
   * @returns {void}
   */
  generateCalendars(): void {
    if (this.calendarView === 'month') {
      this.generateCalendarMonth();
    } else if (this.calendarView === 'week') {
      this.generateCalendarWeek();
    }
  }

  /**
   * Generates a monthly calendar, marking each day's state (complete, incomplete, etc.).
   * Includes empty cells at the start if the month does not begin on Sunday.
   * @returns {void}
   */
  generateCalendarMonth(): void {
    const daysInMonth = getDaysInMonth(this.viewDate); // Días en el mes actual
    const firstDayOfMonth = getDay(startOfMonth(this.viewDate)); // Primer día del mes (0 = Domingo, 1 = Lunes, etc.)

    this.calendar = [];

    // Añadir celdas vacías para los días antes del primer día del mes
    for (let i = 0; i < firstDayOfMonth; i++) {
      this.calendar.push({
        date: null,
        dayOfMonth: null,
        dayOfWeek: null,
      });
    }

    // Añadir celdas para cada día del mes
    const startDate = startOfMonth(this.viewDate);
    const endDate = addDays(startDate, daysInMonth - 1);

    const daysArray = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    daysArray.forEach((day: any) => {
      this.calendar.push({
        date: day,
        dayOfMonth: day.getDate(),
        dayOfWeek: day.getDay(),
        //FIXME: hacer mergue de status
        // state: i > this.today ? 'future' : 'normal',
        icon:
          this.typeCalendar === 'moon'
            ? this.setIconPhase(
                this.phaseMoonDays.find((phase) => phase.day === day.getDate())
                  ?.status || 'new-moon',
              )
            : null,

        state: isToday(day)
          ? 'today'
          : this.typeCalendar === 'moon'
            ? 'none'
            : isFuture(day)
              ? 'future'
              : this.getStatus(day.getDate()),

        // incomplete: i == 11
      });
    });
  }

  /**
   * Determines the state of a given day (complete, incomplete, or normal).
   * @param {number} day - The day of the month to check the state for.
   * @returns {'complete' | 'incomplete' | 'normal'} The state of the specified day.
   */
  getStatus(day: number): 'complete' | 'incomplete' | 'normal' {
    if (this.daysComplete.includes(day)) {
      return 'complete';
    }
    if (this.daysIncomplete.includes(day)) {
      return 'incomplete';
    }
    return 'normal';
  }

  /**
   * Sets the appropriate moon phase icon based on the given phase.
   * @param {string} phase  - A string representing the moon phase.
   * @returns {string}  A string containing the path to the corresponding moon phase icon.
   * @description This function maps different moon phases to their respective icon file paths. It uses an object literal to store the mapping between phase names and icon paths.
   * Supported moon phases:
   * - new-moon
   * - waning-crescent
   * - first-quarter
   * - full-moon
   * - last-quarter
   * - waning-gibbous
   * @example
   * // Usage
   * const iconPath = setIconPhase('full-moon');
   * console.log(iconPath); // Outputs: './../../../assets/images/icons/Moon/full.svg'
   * @throws {TypeError} If an unsupported phase is provided, this function will return undefined.
   */
  setIconPhase(phase: string): string {
    const iconPhase = {
      'new-moon': './../../../assets/images/icons/Moon/new.svg',
      'waning-crescent':
        './../../../assets/images/icons/Moon/Gibosa_crescent.svg',
      'first-quarter': './../../../assets/images/icons/Moon/crescent.svg',
      'full-moon': './../../../assets/images/icons/Moon/full.svg',
      'last-quarter': './../../../assets/images/icons/Moon/declining.svg',
      'waning-gibbous':
        './../../../assets/images/icons/Moon/Gibosa_declining.svg',
    };
    return iconPhase[phase as keyof typeof iconPhase];
  }
  /**
   * Generates a weekly calendar view for the current week.
   * Adds each day in the week and assigns its state.
   * @returns {void}
   */
  generateCalendarWeek(): void {
    const startDate = startOfWeek(this.viewDate);
    const endDate = endOfWeek(this.viewDate);

    const daysArray = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.calendar = daysArray.map((day: any) => {
      return {
        date: day,
        dayOfMonth: day.getDate(),
        dayOfWeek: day.getDay(),
        state: isToday(day)
          ? 'today'
          : this.typeCalendar === 'moon'
            ? 'none'
            : isFuture(day)
              ? 'future'
              : this.getStatus(day.getDate()),
      };
    });
  }

  /**
   * Handles the click event for a day in the calendar, emitting the selected date.
   * @param {calendar | null} date - The calendar day object or null if no date.
   * @returns {void}
   */
  dayClicked(date: calendar | null): void {
    this.dayClick.emit(date);
  }
}
