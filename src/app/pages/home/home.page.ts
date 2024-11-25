import { NotificationService } from './../../services/notification/notification.service';
import { HeaderComponent } from '../../components/header/header.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { MoonCardComponent } from '../../components/moon-card/moon-card.component';
import { Router } from '@angular/router';

/**
 * @class HomePage
 * @description Component for the main homepage of the app. Displays the current date,
 * a progress bar, calendar, and lunar phase card, with modals for various information.
 * It also manages modals and navigation to the moon calendar page.
 */
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    CalendarComponent,
    HeaderComponent,
    ProgressBarComponent,
    MoonCardComponent,
  ],
})
export class HomePage implements OnInit {
  /**
   * Formatted string representing today's date in Spanish.
   * @type {string}
   */
  today: string;

  /**
   * Object representing the visibility state of various modals.
   * - `modal_Days`: Controls visibility for days modal.
   * - `modal_Days_question`: Controls visibility for days question modal.
   * - `modal_token`: Controls visibility for token modal.
   * - `modal_token_2`: Controls visibility for a secondary token modal.
   * @type {{ modal_Days: boolean; modal_Days_question: boolean; modal_token: boolean; modal_token_2: boolean; }}
   */
  modals = {
    modal_Days: false,
    modal_Days_question: false,
    modal_token: false,
    modal_token_2: false,
  };

  /**
   * @constructs HomePage
   * Initializes an instance of HomePage and sets the formatted date string.
   * The date is formatted in Spanish using date-fns.
   * @param {Router} router - Angular Router for handling navigation.
   */
  constructor(
    private router: Router,
    private notificationService: NotificationService,
  ) {
    this.today = format(new Date(), " EEEE dd 'de' MMMM", { locale: es });
  }

  /**
   * Navigates to the moon calendar page.
   * Uses Angular Router to navigate to the specified path.
   * @returns {void}
   */
  goToMoonCalendar(): void {
    void this.router.navigate(['/app/tabs/home/moon-phase']);
  }
 async ngOnInit(): Promise<void> {
   await  this.setNotifications().then(() => {
      console.log('Notificaciones programadas.');
    }).catch((error) => {
      console.error('Error al programar notificaciones:', error);
    });
  }

  async setNotifications(): Promise<void> {
    const hasPermission = await this.notificationService.requestPermissions();
    if (!hasPermission) {
      console.error('Permisos denegados para notificaciones.');
      return;
    }

    // Programar notificaciones diarias
    await this.notificationService.scheduleDailyNotifications();
  }

  // Cancelar todas las notificaciones
  async cancelNotifications(): Promise<void> {
    await this.notificationService.cancelAllNotifications();
  }
}
