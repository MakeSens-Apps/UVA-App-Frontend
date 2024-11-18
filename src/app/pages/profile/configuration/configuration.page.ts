import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonButtons,
  IonButton,
  IonCard,
  IonItem,
  IonToggle,
  IonLabel,
  IonCardContent,
  IonCardHeader,
  IonCardTitle, IonModal, IonFooter, IonList, IonInput } from '@ionic/angular/standalone';
import { Router } from '@angular/router';

/**
 * @class ConfigurationPage
 * @description A page component that allows users to configure settings such as notifications and data management.
 */
@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.page.html',
  styleUrls: ['./configuration.page.scss'],
  standalone: true,
  imports: [IonInput, IonList, IonFooter, IonModal, 
    IonCardTitle,
    IonCardHeader,
    IonCardContent,
    IonLabel,
    IonToggle,
    IonItem,
    IonCard,
    IonButton,
    IonButtons,
    IonIcon,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
  ],
})
export class ConfigurationPage {
  isDisabled = true;
  isNotificationsActive = false;

  /**
   * @param {Router} router - Angular Router instance used for navigation.
   */
  constructor(private router: Router) {}

  /**
   * Navigates back to the specified URL.
   * @param {string} url - The URL to navigate back to.
   * @returns {void}
   */
  goBack(url: string): void {
    void this.router.navigate([url]);
  }

  /**
   * Activates or deactivates notifications based on user input.
   * @param {Event} event - The event object containing the toggle state.
   * @returns {void}
   */
  activeNoti(event: Event): void {
    this.isNotificationsActive = (event as CustomEvent).detail.checked;
    // eslint-disable-next-line no-console
    console.debug('Notificaciones activadas:', this.isNotificationsActive);
  }
  /**
   * Uploads data based on user configurations.
   * @returns {void}
   */
  uploadData(): void {
    // Logic to upload data
  }

  /**
   * Downloads data based on user configurations.
   * @returns {void}
   */
  downloadData(): void {
    // Logic to download data
  }

  /**
   * Synchronizes data based on user configurations.
   * @returns {void}
   */
  synchronizeData(): void {
    // Logic to synchronize data
  }
}
