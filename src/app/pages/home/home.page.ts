import { HeaderComponent } from '../../components/header/header.component';
import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { CalendarComponent } from '@app/components/calendar/calendar.component';
import { ProgressBarComponent } from '../../components/progress-bar/progress-bar.component';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { MoonCardComponent } from '../../components/moon-card/moon-card.component';
import { AppMinimizeService } from '@app/core/services/minimize/app-minimize.service'; 

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
  modals:any = {
    modal_Days: false,
    modal_Days_question: false,
    modal_token: false,
    modal_token_2: false,
  };

  /**
   * Creates an instance of HomePage.
   * Initializes the formatted date string using date-fns with Spanish locale.
   *@param {ChangeDetectorRef} ChangeDetectorRef Angular detecte change in app.
   * @param {AppMinimizeService} minimizeService - The AppMinimizeService.
   */
  constructor(
    private cdr: ChangeDetectorRef,
    private minimizeService: AppMinimizeService,
  ) {
    this.today = format(new Date(), " EEEE dd 'de' MMMM", { locale: es });
    this.minimizeService.initializeBackButtonHandler()
  }


   /**
 * Open a modal by key
 * @param modalKey - Key of the modal to open
 */
   openModal(modalKey: string): void {
    this.modals[modalKey] = true;
    this.cdr.detectChanges()
  }

/**
 * Close a modal by key
 * @param modalKey - Key of the modal to close
 */
  onModalDismiss(modalKey: string): void {
    this.modals[modalKey] = false;
    this.cdr.detectChanges()
  }

/**
 * Close a modal and open another one
 * @param currentModalKey - Modal key to close
 * @param nextModalKey - Modal key to open
 */
  onCloseAndOpen(currentModalKey: string, nextModalKey: string): void {
    this.modals[currentModalKey] = false;

    // Ensure Angular detects the change before opening the next modal
    setTimeout(() => {
      this.modals[nextModalKey] = true;
      this.cdr.detectChanges()
    }, 300); // Delay to avoid race conditions
  }

}
