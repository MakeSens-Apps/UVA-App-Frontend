import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

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
   */
  constructor(private router: Router) {}
  achievements = [
    { icon: '../../../../assets/images/icons/brote1.png' },
    { icon: '../../../../assets/images/icons/platula.svg' },
    { icon: '../../../../assets/images/icons/flor.svg' },
    { icon: '../../../../assets/images/icons/platula.svg' },
  ];

  modals = {
    modal_show: false,
    modal_show_2: false,
  };

  /**
   * Navigates back to the specified URL.
   * @param {string} url - The URL to navigate back to.
   * @returns {Promise<void>} A promise that resolves when the navigation is complete.
   */
  async goBack(url: string): Promise<void> {
    await this.router.navigate([url]);
  }
}
