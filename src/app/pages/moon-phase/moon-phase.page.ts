import { Component } from '@angular/core';
import { HeaderComponent } from '@app/components/header/header.component';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  LUNAR_PHASE_NAME,
  MoonCardComponent,
} from '@app/components/moon-card/moon-card.component';

// Mapping of month indices to month names in Spanish
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meses: any = {
  0: 'Enero',
  1: 'Febrero',
  2: 'Marzo',
  3: 'Abril',
  4: 'Mayo',
  5: 'Junio',
  6: 'Julio',
  7: 'Agosto',
  8: 'Septiembre',
  9: 'Octubre',
  10: 'Noviembre',
  11: 'Diciembre',
};

/**
 * @class MoonPhasePage
 * @description Page component that displays the current lunar phase and month name.
 * It includes a calendar and moon card for lunar information visualization.
 */
@Component({
  selector: 'app-moon-phase',
  templateUrl: './moon-phase.page.html',
  styleUrls: ['./moon-phase.page.scss'],
  standalone: true,
  imports: [
    HeaderComponent,
    CalendarComponent,
    CommonModule,
    IonicModule,
    MoonCardComponent,
  ],
})
export class MoonPhasePage {
   /**
   * The current month name in Spanish.
   * @type {string}
   */
   month: string;

   /**
    * The current lunar phase, represented as a key in LUNAR_PHASE_NAME.
    * @type {keyof typeof LUNAR_PHASE_NAME}
    * @default 'FULL_MOON'
    */
   phase: keyof typeof LUNAR_PHASE_NAME = 'FULL_MOON';
 
   /**
    * The name of the current lunar phase.
    * Derived from the LUNAR_PHASE_NAME constant based on the phase.
    * @type {string}
    */
   phaseName = LUNAR_PHASE_NAME[this.phase];
 
   /**
    * @constructs MoonPhasePage
    * Initializes the MoonPhasePage component, setting the current month name based on the system date.
    */
  constructor() {
    const month = new Date().getMonth();
    this.month = meses[month];
  }
  /* 
  ngOnInit() {
  }
 */
}
