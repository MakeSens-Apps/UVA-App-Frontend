import { ChangeDetectorRef, Component, Input } from '@angular/core';
import {
  IonChip,
  IonHeader,
  IonIcon,
  IonToolbar,
  IonAvatar,
  IonLabel,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
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
  @Input() title = ' Inicio';

  /**
   * @param {Router} router Angular Router instance used for navigation.
   * @param {ChangeDetectorRef} ChangeDetectorRef Angular detecte change in app.
   */
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Navigates to the profile page.
   * @returns {void}
   */
  goToProfile(): void {
    void this.router.navigate(['/profile']);
  }

  /**
   * Navigates to home cellphone.
   * @returns {void}
   */
  goToMinimize(): void {
  
      App.exitApp(); 
      this.cdr.detectChanges()
  }
}
