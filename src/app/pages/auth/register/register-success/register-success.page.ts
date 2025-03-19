import { Component } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router } from '@angular/router';

/**
 * Component representing the success page shown after registration.
 * Provides navigation functionality to the login page.
 */
@Component({
  selector: 'app-register-success',
  templateUrl: './register-success.page.html',
  styleUrls: ['./register-success.page.scss'],
  standalone: true,
  imports: [IonButton, ExploreContainerComponent],
})
export class RegisterSuccessPage {
  /**
   * Creates an instance of RegisterSuccessPage.
   * @param {Router} router - The Angular Router used for navigation.
   */
  constructor(private router: Router) {}

  /**
   * Navigates the user to the login page, replacing the current URL in the browser's history.
   * @returns {Promise<void>} A promise that resolves once navigation is complete.
   */
  async goToLogin(): Promise<void> {
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
