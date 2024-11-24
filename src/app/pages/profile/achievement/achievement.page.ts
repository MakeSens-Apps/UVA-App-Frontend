import {
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { UserProgressDSService } from '@app/core/services/storage/datastore/user-progress-ds.service';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';

interface Achievement {
  icon: string; // Define el path del ícono como un string
}

@Component({
  selector: 'app-achievement',
  templateUrl: './achievement.page.html',
  styleUrls: ['./achievement.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AchievementPage {
  /**
   * @param {Router} router - Angular Router instance used for navigation.
   * @param {ChangeDetectorRef} cdr Angular detecte change in app.
   * @param {ConfigurationAppService} configurationApp Configuration App
   */
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private configurationApp: ConfigurationAppService,
  ) {}
  achievements: Achievement[] = [];

  modals: Record<string, boolean> = {
    modal_token_a: false,
    modal_token_b: false,
  };

  /**
   * view about to enter
   */
  ionViewWillEnter(): void {
    UserProgressDSService.getMilestones()
      .then(async (response) => {
        let blob: Achievement;
        response.forEach((milestone) => {
          switch (milestone) {
            case 'brote': {
              blob.icon = '../../../../assets/images/icons/brote1.png';
              break;
            }
            case 'plantula': {
              blob.icon = '../../../../assets/images/icons/platula.svg';
              break;
            }
            case 'flor': {
              blob.icon = '../../../../assets/images/icons/flor.svg';
              break;
            }
            default:
              blob.icon = '';
              break;
          }
          if (blob.icon.trim() !== '') {
            this.achievements.push(blob);
          }
        });
      })
      .catch((err) => {
        console.error(err);
      });
  }
  /**
   * Navigates back to the specified URL.
   * @param {string} url - The URL to navigate back to.
   * @returns {Promise<void>} A promise that resolves when the navigation is complete.
   */
  async goBack(url: string): Promise<void> {
    await this.router.navigate([url]);
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
}
