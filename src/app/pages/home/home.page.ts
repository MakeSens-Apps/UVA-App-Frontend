import { HeaderComponent } from '../../components/header/header.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { MoonCardComponent } from '../../components/moon-card/moon-card.component';
import { UserProgressDSService } from '@app/core/services/storage/datastore/user-progress-ds.service';
import { UserProgress } from 'src/models';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { ConfigModel } from 'src/models/configuration/config.model';

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
  userProgress: UserProgress | undefined;
  configurationApp: ConfigModel | undefined;
  totalTask = 1;
  /**
   * Creates an instance of HomePage.
   * Initializes the formatted date string using date-fns with Spanish locale.
   * @param {ConfigurationAppService} configuration Configuration App
   */
  constructor(private configuration: ConfigurationAppService) {
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
  }
}
