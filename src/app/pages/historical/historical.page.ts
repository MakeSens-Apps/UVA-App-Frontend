import { Component } from '@angular/core';
import { HeaderComponent } from '@app/components/header/header.component';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { CalendarComponent } from '@app/components/calendar/calendar.component';

@Component({
  selector: 'app-historical',
  templateUrl: 'historical.page.html',
  styleUrls: ['historical.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, HeaderComponent, CalendarComponent],
})
export class HistoricalPage {
  /**
   *
   */
  constructor() {}
}
