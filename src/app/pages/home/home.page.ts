import { HeaderComponent } from '../../components/header/header.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { MoonCardComponent } from '../../components/moon-card/moon-card.component';
import {
  ProfileService,
  LASTUSERPROGRESS,
} from '@app/core/services/view/profile/profile.service';
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
  today: string;
  modals = {
    modal_Days: false,
    modal_Days_question: false,
    modal_token: false,
    modal_token_2: false,
  };
  userProgress: LASTUSERPROGRESS = {
    seed: 0,
    streak: 0,
    completedTask: 0,
  };
  /**
   * Creates an instance of HomePage.
   * Initializes the formatted date string using date-fns with Spanish locale.
   * @param {ProfileService} profileUser - Servicio Perfil Usuario
   */
  constructor(private profileUser: ProfileService) {
    this.today = format(new Date(), " EEEE dd 'de' MMMM", { locale: es });
  }

  /**
   * Inicio de pagina
   */
  async ngOnInit(): Promise<void> {
    this.userProgress = await this.profileUser.lastUserProgress();
  }
}
