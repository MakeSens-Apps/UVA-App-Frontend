import { Component, Input } from '@angular/core';
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

/**
 * @class HeaderComponent
 *  a header component with navigation functionality,using various Ionic components such as header,icon,chip,avatar,and label.
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
export class HeaderComponent {
  /**
   * The title displayed in the header.
   * @type {string}
   * @default 'Inicio'
   */
  @Input() title = 'Inicio';

  @Input() hasBackButton = false;
  @Input() routerBackButton = '/';

  /**
   * @param {Router} router Angular Router instance used for navigation.
   */
  constructor(private router: Router) {}

  /**
   * Navigates to the profile page.
   * @returns {void}
   */
  goToProfile(): void {
    void this.router.navigate(['/profile']);
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
