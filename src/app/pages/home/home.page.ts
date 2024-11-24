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
import {
  MoonPhaseService,
  LunarPhase,
} from '@app/core/services/view/moon/moon-phase.service';
import { UserProgressDSService } from '@app/core/services/storage/datastore/user-progress-ds.service';
import { UserProgress } from 'src/models';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { ConfigModel } from 'src/models/configuration/config.model';

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
  today: string;
  phase: LunarPhase = LunarPhase.FULL_MOON;
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
  userProgress: UserProgress | undefined;
  configurationApp: ConfigModel | undefined;
  totalTask = 1;
  /**
   * @constructs HomePage
   * Initializes an instance of HomePage and sets the formatted date string.
   * The date is formatted in Spanish using date-fns.
   * @param {Router} router - Angular Router for handling navigation.
   * @param {MoonPhaseService} moonphase - Moon Phase Service.
   * @param {ConfigurationAppService} configuration Configuration App
   */
  constructor(
    private router: Router,
    private moonphase: MoonPhaseService,
    private configuration: ConfigurationAppService,
  ) {
    this.today = format(new Date(), " EEEE dd 'de' MMMM", { locale: es });
  }

  /**
   * Inicio de pagina
   */
  async ngOnInit(): Promise<void> {
    const config = await this.configuration.getConfigurationApp();
    const configMeasurement =
      await this.configuration.getConfigurationMeasurement();
    if (configMeasurement) {
      console.log(typeof configMeasurement);
      this.totalTask = this.configuration.countTasks(configMeasurement);
      console.log(this.totalTask);
    }
    if (config) {
      console.log(typeof config);
      this.configurationApp = config;
    }
    const userprogress = await UserProgressDSService.getLastUserProgress();
    if (userprogress) {
      this.userProgress = userprogress;
      console.log(userprogress);
    }
    const currentPhase = await this.moonphase.getCurrentPhase();
    if (currentPhase.success) {
      this.phase = currentPhase.data;
    }
  }

  /**
   * Navigates to the moon calendar page.
   * Uses Angular Router to navigate to the specified path.
   * @returns {void}
   */
  goToMoonCalendar(): void {
    void this.router.navigate(['/app/tabs/home/moon-phase']);
  }
}
