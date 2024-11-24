import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '@app/components/header/header.component';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  LUNAR_PHASE_NAME,
  MoonCardComponent,
} from '@app/components/moon-card/moon-card.component';
import {
  MoonPhaseService,
  DailyPhaseCalendar,
  MoonEvent,
} from '@app/core/services/view/moon/moon-phase.service';
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
export class MoonPhasePage implements OnInit {
  month: string;
  phase: keyof typeof LUNAR_PHASE_NAME = 'FULL_MOON';
  phaseName = LUNAR_PHASE_NAME[this.phase];
  phaseMoonDays: DailyPhaseCalendar[] = [];
  moonEvents: MoonEvent[] = [];

  /**
   * @constructs MoonPhasePage
   * @param {MoonPhaseService} moonphaseService - The MoonPhaseService to fetch moon phase data.
   * Initializes the MoonPhasePage component, setting the current month name based on the system date.
   */
  constructor(private moonphaseService: MoonPhaseService) {
    const month = new Date().getMonth();
    this.month = meses[month];
  }

  /**
   * Lifecycle method to fetch moon phase data and events when the component is initialized.
   * Fetches the current phase, the phases of the current month, and upcoming moon events.
   * Updates the component's phase, phaseName, phaseMoonDays, and moonEvents properties accordingly.
   * @async
   * @returns {Promise<void>} - A promise that resolves when data has been loaded.
   * @throws {Error} - If there is an error fetching the moon phase data or events.
   */
  async ngOnInit(): Promise<void> {
    try {
      // Ejecutar todas las solicitudes en paralelo
      const [response, responseMonth, responseEvents] = await Promise.all([
        this.moonphaseService.getCurrentPhase(),
        this.moonphaseService.getMonthPhases(),
        this.moonphaseService.getNextMoonEvents(),
      ]);

      // Manejar la respuesta de getCurrentPhase
      if (response.success) {
        this.phase = response.data;
        this.phaseName = LUNAR_PHASE_NAME[this.phase];
      }

      // Manejar la respuesta de getMonthPhases
      if (responseMonth.success) {
        this.phaseMoonDays = responseMonth.data;
      }

      // Manejar la respuesta de getNextMoonEvents
      if (responseEvents.success) {
        this.moonEvents = responseEvents.data.map((event) => ({
          ...event,
          date: new Date(event.date).toLocaleDateString('es-ES', {
            weekday: 'short',
            day: '2-digit',
            month: 'long',
          }),
        }));
      }
    } catch (error) {
      console.error('Error al cargar los datos de la luna:', error);
    }
  }
}
