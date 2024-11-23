import { HeaderComponent } from '../../components/header/header.component';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { MoonCardComponent } from '../../components/moon-card/moon-card.component';
import { AppMinimizeService } from '@app/core/services/minimize/app-minimize.service';
import { Subscription } from 'rxjs';
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
export class HomePage implements OnInit, OnDestroy {
  today: string;
  modals: Record<string, boolean> = {
    modal_Days: false,
    modal_Days_question: false,
    modal_token: false,
    modal_token_2: false,
  };
  private backButtonSubscription!: Subscription;
  userProgress: UserProgress | undefined;
  configurationApp: ConfigModel | undefined;
  totalTask = 1;
  /**
   * Creates an instance of HomePage.
   * Initializes the formatted date string using date-fns with Spanish locale.
   * @param {ChangeDetectorRef} cdr Angular detecte change in app.
   * @param {AppMinimizeService} minimizeService - The AppMinimizeService.
   * @param {ConfigurationAppService} configuration Configuration App
   */
  constructor(
    private cdr: ChangeDetectorRef,
    private minimizeService: AppMinimizeService,
    private configuration: ConfigurationAppService,
  ) {
    this.today = format(new Date(), " EEEE dd 'de' MMMM", { locale: es });
    this.minimizeService.initializeBackButtonHandler();
  }

  /**
   * Open a modal by key
   * @param {string} modalKey - Key of the modal to open
   */
  openModal(modalKey: string): void {
    this.modals[modalKey] = true;
    this.cdr.detectChanges();
  }

  /**
   * Close a modal by key
   * @param {string} modalKey - Key of the modal to close
   */
  onModalDismiss(modalKey: string): void {
    this.modals[modalKey] = false;
    this.cdr.detectChanges();
  }

  /**
   * Close a modal and open another one
   * @param {string} currentModalKey - Modal key to close
   * @param {string} nextModalKey - Modal key to open
   */
  onCloseAndOpen(currentModalKey: string, nextModalKey: string): void {
    this.modals[currentModalKey] = false;

    // Ensure Angular detects the change before opening the next modal
    setTimeout(() => {
      this.modals[nextModalKey] = true;
      this.cdr.detectChanges();
    }, 300); // Delay to avoid race conditions
  }

  /**
   * Cleans up the back button subscription when the component is destroyed.
   * This prevents memory leaks and ensures no further events are handled for this subscription.
   * @returns {void}
   */
  ngOnDestroy(): void {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
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
