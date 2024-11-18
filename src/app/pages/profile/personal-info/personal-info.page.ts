import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { IonicModule, AlertController, InputChangeEventDetail } from '@ionic/angular';
import { Router } from '@angular/router';
import { IonInputCustomEvent } from '@ionic/core';

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
  isEditable: boolean = false;
  modals = {
    modal_Delete: false,
    modal_show_2: false,
  };
  deleteConfirmationInput: string = ''; // Almacena el texto ingresado
  isInputValid: boolean = false; // Controla si el botón debe habilitarse
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
 * Alternar entre editar y solo lectura
 */
toggleEdit() {
  this.isEditable = !this.isEditable;

  if (this.isEditable) {
    // Enfocar el primer campo y agregar la clase focused
    setTimeout(() => {
      const firstItem = document.querySelector('ion-item');
      if (firstItem) {
        firstItem.classList.add('focused');
        const firstInput = firstItem.querySelector('ion-input input') as HTMLInputElement | null;
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 100);
  } else {
    this.onSubmit();
    this.clearFocus(); // Limpia el foco al guardar
  }
}


/**
 * Manejar foco de un campo
 * @param event - Evento de foco de Ionic
 */
handleFocus(event: IonInputCustomEvent<FocusEvent>): void {
  const parentItem = (event.target as HTMLElement).closest('ion-item');
  if (parentItem) {
    parentItem.classList.add('focused');
  }
}

/**
 * Manejar desenfoque de un campo
 * @param event - Evento de desenfoque de Ionic
 */
handleBlur(event: IonInputCustomEvent<FocusEvent>): void {
  const parentItem = (event.target as HTMLElement).closest('ion-item');
  
  if (parentItem) {
    parentItem.classList.remove('focused');
  }
}


  /**
   * Limpia todos los focos
   */
  clearFocus(): void {
    const items = document.querySelectorAll('ion-item');
    items.forEach((item) => item.classList.remove('focused'));
  }


    /**
   * validate the entry is correct
   * @returns {void}
   */
  validateInput() {
    this.isInputValid = this.deleteConfirmationInput === 'ELIMINAR CUENTA';
  }

  /**
   * Sends a request to delete the user's account.
   * @returns {void}
   */
  goDeleteAccount(): void {
    if (this.isInputValid) {
      console.log('Cuenta eliminada');
      // Aquí puedes agregar tu lógica para eliminar la cuenta
    }
  }
}
