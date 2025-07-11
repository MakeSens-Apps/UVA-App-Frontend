import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

/**
 * @class DayComponent
 * @description A component representing a single day in a calendar view, displaying the day's number, status, and optional icons.
 */
@Component({
  selector: 'app-day',
  templateUrl: './day.component.html',
  styleUrls: ['./day.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class DayComponent {
  /**
   * The day of the month displayed in this component.
   * @type {number}
   * @default 0
   */
  @Input() day = 0;

  /**
   * Indicates whether this is a small calendar "mini calendar".
   * @type {boolean}
   * @default false
   */
  @Input() isMiniCalendar = false;

  /**
   * The status of the day, which can indicate task completion, future dates, or other states.
   * @type {'complete' | 'incomplete' | 'future' | 'saveStreak' |'normal' | 'none' | undefined}
   * @default 'normal'
   */
  @Input() state:
    | 'complete'
    | 'incomplete'
    | 'future'
    | 'normal'
    | 'today'
    | 'saveStreak'
    | 'none'
    | undefined = 'normal';

  /**
   * Path to the icon displayed on the day component, typically representing status.
   * @type {string | null | undefined}
   * @default './../../../../assets/images/icons/check.svg'
   */
  @Input() icon: string | null | undefined =
    './../../../../assets/images/icons/checkSaveStreak.svg';

  /**
   * Flag to specify if a custom icon is used instead of the default icon.
   * @type {boolean}
   * @default false
   */
  @Input() customIcon = false;

  /**
   * Position of the icon on the day component.
   * Accepts 'top', 'bottom-left', and other positions as specified.
   * @type {'top' | 'bottom-left'}
   * @default 'bottom-left'
   */
  @Input() iconPosition: 'top' | 'bottom-left' = 'bottom-left';
  //FIXME: set config by: |'bottom'|'left'|'right'|'top-left'|'top-right'|'bottom-right'

  /**
   * Indicates if the day component is part of a moon phase calendar.
   * @type {boolean}
   * @default false
   */
  @Input() isMoonCalendar = false;

  /**
   * @constructs DayComponent
   * Creates an instance of DayComponent.
   */ constructor() {}
}
