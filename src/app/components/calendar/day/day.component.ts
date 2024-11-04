import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';

/**
 * @class DayComponent
 * @description A component that represents a single day in a calendar view, displaying information such as the date and its status.
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
   * The day of the month represented by this component.
   * @type {number}
   * @default 0
   */
  @Input() day = 0;

  /**
   * Indicates whether this day is today.
   * @type {boolean}
   * @default false
   */
  @Input() isToday = false;

  /**
   * The state of the day, which can be 'complete', 'incomplete', 'future', or 'normal'.
   * @type {'complete' | 'incomplete' | 'future' | 'normal' | undefined}
   * @default 'normal'
   */
  @Input() state: 'complete' | 'incomplete' | 'future' | 'normal' | undefined =
    'normal';

  /**
   * @constructs
   * Creates an instance of DayComponent.
   */
  constructor() {}
}
