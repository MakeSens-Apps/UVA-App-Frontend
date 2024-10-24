import { Component } from '@angular/core';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import {
  IonButton,
  IonInput,
  IonLabel,
  ModalController,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertComponent } from '@app/components/alert/alert.component';
import { SetupService } from '@app/core/services/view/setup/setup.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    ExploreContainerComponent,
    IonLabel,
    IonInput,
    IonButton,
    ReactiveFormsModule,
    FormsModule,
  ],
})
/**
 * Class representing the login page.
 * Handles user login, validation, and navigation.
 */
export class LoginPage {
  form: FormGroup;
  /**
   * Constructs the LoginPage component.
   * Initializes the form and checks if there is a current authenticated user.
   * @param {Router} router - The Angular Router for navigation.
   * @param {FormBuilder} formBuilder - The Angular FormBuilder for creating reactive forms.
   * @param {ModalController} modalCtrl - The Ionic ModalController to manage modals.
   * @param {SetupService} service - The SetupService to handle authentication and session management.
   */
  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private modalCtrl: ModalController,
    private service: SetupService,
  ) {
    this.form = this.formBuilder.group({
      phone: new FormControl(
        '',
        Validators.compose([
          Validators.required,
          Validators.maxLength(10),
          Validators.minLength(10),
        ]),
      ),
    });
    // Check if there's an authenticated user. If yes, navigate to the home page.
    this.service
      .currentAuthenticatedUser()
      .then((response) => {
        if (response) {
          void this.goToHome();
        }
      })
      .catch((err) => {
        console.error('No encontro un usuario', err);
      });
  }

  /**
   * Navigates the user to the home page.
   * @returns {Promise<boolean>} A promise that resolves to true if navigation was successful.
   */
  goToHome(): Promise<boolean> {
    return this.router.navigate(['home']);
  }

  /**
   * Navigates the user to the pre-registration page.
   * @returns {Promise<boolean>} A promise that resolves to true if navigation was successful.
   */
  goToRegister(): Promise<boolean> {
    return this.router.navigate(['pre-register']);
  }

  /**
   * Opens the OTP (One-Time Password) modal for the user.
   */
  goToOtp(): void {
    void this.abrirModal();
  }

  /**
   * Opens a modal asking the user to confirm their phone number before signing in.
   * If the user confirms, it attempts to sign them in and navigate to the OTP page.
   * If the user is not found, it opens a registration modal.
   * @returns {Promise<void>} A promise that resolves once the modal has been processed.
   */
  async abrirModal(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AlertComponent,
      componentProps: {
        content: `<p> ¿Es correcto este número de teléfono: <strong> ${this.form.controls['phone'].value} </strong>? </p>`,
        textCancelButton: 'No, editar',
        textOkButton: 'Sí, continuar',
      },
      cssClass: 'custom-modal',
      backdropDismiss: false,
    });

    // Recibir la respuesta del modal
    modal
      .onDidDismiss()
      .then(async (data) => {
        if (data.data.action === 'OK') {
          const response = await this.service.signIn(
            '+57' + this.form.controls['phone'].value,
          );
          if (!response.success) {
            if (response.error.name == 'UserNotFoundException') {
              await this.openModalNoRegister();
              return;
            }
          }
          await this.router.navigate([
            'otp/login',
            this.form.controls['phone'].value,
          ]);
        }
      })
      .catch((err) => {
        console.error('No proceso respuesta de modal', err);
      });

    await modal.present();
  }

  /**
   * Opens a modal notifying the user that their phone number is not registered.
   * Asks if the user wants to register. If the user confirms, they are navigated to the registration page.
   * @returns {Promise<void>} A promise that resolves once the modal has been processed.
   */
  async openModalNoRegister(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AlertComponent,
      componentProps: {
        content: `<p> El número <strong> ${this.form.controls['phone'].value} </strong> no se encuentra registrado.
        </p>
        <h3>¿Quieres registrarte?</h3>
          `,
        textCancelButton: 'No',
        textOkButton: 'Sí, registrame',
      },
      cssClass: 'custom-modal',
      backdropDismiss: false,
    });

    // Recibir la respuesta del modal
    modal
      .onDidDismiss()
      .then(async (data) => {
        if (data.data.action === 'OK') {
          await this.goToRegister();
        }
      })
      .catch((err) => {
        console.error('No proceso modal de registro', err);
      });

    await modal.present();
  }
}
