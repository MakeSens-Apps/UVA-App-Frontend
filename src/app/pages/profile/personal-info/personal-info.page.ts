import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

// Definición de los campos de usuario
const userFields = [
  {
    key: 'userName',
    label: 'Nombres',
    type: 'string',
    placeholder: '[Nombres del monitor]',
  },
  {
    key: 'userLastName',
    label: 'Apellidos',
    type: 'string',
    placeholder: '[Apellidos del monitor]',
  },
  {
    key: 'userPhoneNumber',
    label: 'Teléfono',
    type: 'string',
    placeholder: '3183766489',
  },
  {
    key: 'userEmail',
    label: 'Email',
    type: 'string',
    placeholder: 'Correo@example.com',
  },
  {
    key: 'latitude',
    label: 'Latitud',
    type: 'string',
    placeholder: '70 55’ 30”',
  },
  { key: 'longitude', label: 'Longitud', type: 'string', placeholder: '90°' },
  { key: 'altitude', label: 'Altitud', type: 'string', placeholder: '850 m' },
];

/**
 * @class PersonalInfoPage
 * @description A page component for capturing personal information with form validation.
 */
@Component({
  selector: 'app-personal-info',
  templateUrl: './personal-info.page.html',
  styleUrls: ['./personal-info.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PersonalInfoPage implements OnInit {
  userForm!: FormGroup;
  fields = userFields;
  modals = {
    modal_Delete: false,
  };

  /**
   * @param {Router} router - Angular Router instance used for navigation.
   * @param {FormBuilder} fb - FormBuilder instance to create reactive forms.
   * @param {AlertController} alertController - Controller to manage alert popups.
   */
  constructor(
    private router: Router,
    private fb: FormBuilder,
    private alertController: AlertController,
  ) {}

  /**
   * Lifecycle hook that is called after data-bound properties are initialized.
   * Initializes the user form.
   * @returns {void}
   */
  ngOnInit(): void {
    this.initializeForm();
  }

  /**
   * Initializes the reactive form with user fields and validation.
   * @returns {void}
   */
  initializeForm(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formControls: Record<string, any> = {}; // Definir tipo explícito
    this.fields.forEach((field) => {
      formControls[field.key] = ['', Validators.required];
    });
    this.userForm = this.fb.group(formControls);
  }

  /**
   * Submits the user form and handles validation.
   * @returns {Promise<void>}
   */
  async onSubmit(): Promise<void> {
    if (this.userForm.valid) {
      // Aquí puedes enviar los datos a tu endpoint
    } else {
      await this.showAlert(); // Llamar a la función que muestra la alerta
    }
  }

  /**
   * Displays an alert when the form is invalid.
   * @returns {Promise<void>}
   */
  async showAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message: 'Por favor, complete todos los campos obligatorios.',
      buttons: ['OK'],
    });

    await alert.present();
  }

  /**
   * Navigates back to the specified URL.
   * @param {string} url - The URL to navigate back to.
   * @returns {void}
   */
  goBack(url: string): void {
    void this.router.navigate([url]);
  }

  /**
   * Sends a request to delete the user's account.
   * @returns {void}
   */
  goDeleteAcount(): void {
    // Here you can send the data to your endpoint to delete the account
  }
}
