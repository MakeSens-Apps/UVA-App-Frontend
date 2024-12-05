import { NotificationService } from './../../services/notification/notification.service';
import { HeaderComponent } from '../../components/header/header.component';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { MoonCardComponent } from '../../components/moon-card/moon-card.component';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  MoonPhaseService,
  LunarPhase,
} from '@app/core/services/view/moon/moon-phase.service';
import {
  UserProgressDSService,
  CompletedTask,
} from '@app/core/services/storage/datastore/user-progress-ds.service';
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
export class HomePage implements OnInit, OnDestroy {
  /**
   * Formatted string representing today's date in Spanish.
   * @type {string}
   */
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
  completeTask: CompletedTask | undefined;
  /**
   * Creates an instance of HomePage.
   * Initializes an instance of HomePage and sets the formatted date string.
   * The date is formatted in Spanish using date-fns.
   * @param {Router} router - Angular Router for handling navigation.
   * @param {NotificationService} notificationService Notifications
   * @param {ChangeDetectorRef} cdr Angular detecte change in app.
   * @param {MoonPhaseService} moonphase - Moon Phase Service.
   * @param {ConfigurationAppService} configuration Configuration App
   */
  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private moonphase: MoonPhaseService,
    private configuration: ConfigurationAppService,
  ) {
    this.today = format(new Date(), " EEEE dd 'de' MMMM", { locale: es });
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
      this.totalTask = this.configuration.countTasks(configMeasurement);
    }
    if (config) {
      this.configurationApp = config;
    }
    await this.setNotifications();
  }

  /**
   * view about to enter
   */
  async ionViewWillEnter(): Promise<void> {
    const userprogress = await UserProgressDSService.getLastUserProgress();
    if (userprogress) {
      this.userProgress = userprogress;
    }
    const currentPhase = await this.moonphase.getCurrentPhase();
    if (currentPhase.success) {
      this.phase = currentPhase.data;
    }
    this.completeTask = await UserProgressDSService.getCompleteTaskWeek(
      this.totalTask,
    );
  }

  /**
   * Navigates to the moon calendar page.
   * Uses Angular Router to navigate to the specified path.
   * @returns {void}
   */
  goToMoonCalendar(): void {
    void this.router.navigate(['/app/tabs/moon-phase']);
  }

  /**
   * Schedules daily notifications if notifications are enabled.
   * @returns {Promise<void>} A promise that resolves when the notifications are set.
   */
  async setNotifications(): Promise<void> {
    const enableNotifications =
      await this.notificationService.getEnableNotifications();
    if (enableNotifications) {
      await this.notificationService.scheduleDailyNotifications();
    }
  }

  /**
   * Cancels all scheduled notifications.
   * @returns {Promise<void>} A promise that resolves when all notifications are cancelled.
   */
  async cancelNotifications(): Promise<void> {
    await this.notificationService.cancelAllNotifications();
  }
}
