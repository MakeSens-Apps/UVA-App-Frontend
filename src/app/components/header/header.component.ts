import { Component, Input } from '@angular/core';
import {
  IonChip,
  IonHeader,
  IonIcon,
  IonToolbar,
  IonAvatar,
  IonLabel,
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
  imports: [IonHeader, IonIcon, IonToolbar, IonChip, IonAvatar, IonLabel],
})
export class HeaderComponent {
  /**
   * The title displayed in the header.
   * @type {string}
   * @default 'Inicio'
   */
  @Input() title = 'Inicio';

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
}
