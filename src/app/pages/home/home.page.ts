import { HeaderComponent } from '../../components/header/header.component';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { MoonCardComponent } from '../../components/moon-card/moon-card.component';
import { Router } from '@angular/router';

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
export class HomePage {
  today: string;
  modals = {
    modal_Days: false,
    modal_Days_question: false,
    modal_token: false,
    modal_token_2: false,
  };

  /**
   * Creates an instance of HomePage.
   * Initializes the formatted date string using date-fns with Spanish locale.
   *
   */
  constructor(private router: Router) {
    this.today = format(new Date(), " EEEE dd 'de' MMMM", { locale: es });
  }

  goToMoonCalendar(): void {
    void this.router.navigate(['/app/tabs/home/moon-phase']);
  }
}
