import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import {
  IonChip,
  IonHeader,
  IonIcon,
  IonToolbar,
  IonAvatar,
  IonLabel,
  IonButtons,
  IonButton,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { UserProgressDSService } from '@app/core/services/storage/datastore/user-progress-ds.service';
/**
 * HeaderComponent is a reusable header UI component.
 * It integrates navigation functionality, customizable title, and profile-related actions.
 * This component uses various Ionic components such as header, icon, chip, avatar, and label.
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonIcon,
    IonToolbar,
    IonChip,
    IonAvatar,
    IonLabel,
    IonButtons,
    IonButton,
  ],
})
export class HeaderComponent implements OnInit {
  /**
   * The title displayed in the header.
   * @type {string}
   * @default 'Inicio'
   */
  @Input() title = 'Inicio';

  /**
   * Seed used for user-related functionality, potentially loaded asynchronously.
   * @type {number | null | undefined}
   */
  @Input() seed: number | null | undefined;

  /**
   * Whether the header includes a back button.
   * @type {boolean}
   * @default false
   */
  @Input() hasBackButton = false;

  /**
   * The route to navigate to when the back button is clicked.
   * @type {string}
   * @default '/'
   */
  @Input() routerBackButton = '/';

  /**
   * Whether the header includes a profile button.
   * @type {boolean}
   * @default true
   */
  @Input() hasProfileButton = true;

  @Input() hasCenterTitle = false;
  /**
   * Creates an instance of HeaderComponent.
   * @param {Router} router - Angular Router instance used for navigation.
   * @param {ChangeDetectorRef} cdr - Angular ChangeDetectorRef for detecting changes in the component.
   */
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Navigates to the profile page.
   * @returns {void}
   */
  goToProfile(): void {
    void this.router.navigate(['/profile']);
  }

  /**
   * Angular lifecycle hook that is invoked after the component is initialized.
   * If the seed is not provided as an input, it retrieves the seed from user progress.
   * @async
   * @returns {Promise<void>} A promise that resolves when initialization is complete.
   */
  async ngOnInit(): Promise<void> {
    if (!this.seed) {
      const userProgress = await UserProgressDSService.getLastUserProgress();
      if (userProgress) {
        this.seed = userProgress.Seed;
      }
    }
  }

  /**
   * Navigates back to the specified URL, with additional logic for logging out if the URL is '/login'.
   * @param {string} url - The URL to navigate back to.
   * @returns {void}
   */
  goBack(url?: string): void {
    if (url == '/login') {
      // Lógica de deslogueo
    }
    void this.router.navigate([url]);
  }
}
