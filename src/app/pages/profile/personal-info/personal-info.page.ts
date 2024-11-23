import {
  Component,
  OnInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
} from '@angular/core';
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
import { IonInputCustomEvent } from '@ionic/core';
import { SessionService } from '@app/core/services/session/session.service';

// Define user personal fields
interface FieldsPersonalInfo {
  key: string;
  label: string;
  type: string;
  placeholder: string;
  onLine?: boolean;
  disabled?: boolean;
}
const userPersonalFields: FieldsPersonalInfo[] = [
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
    placeholder: '#Celular',
    disabled: true,
  },
  {
    key: 'userEmail',
    label: 'Email',
    type: 'string',
    placeholder: 'correo@example.com',
  },
];

// Define user location fields
const userLocationFields: FieldsPersonalInfo[] = [
  {
    key: 'finca',
    label: 'Nombre de la finca',
    type: 'string',
    placeholder: '[Nombre de la finca]',
  },
  {
    key: 'vereda',
    label: 'Nombre de la vereda',
    type: 'string',
    placeholder: '[Nombre de la vereda]',
  },
  {
    key: 'municipio',
    label: 'Nombre del municipio',
    type: 'string',
    placeholder: '[Nombre del municipio]',
  },
  {
    key: 'latitude',
    label: 'Latitud',
    type: 'string',
    placeholder: '70° 55’ 30”',
    onLine: true,
  },
  {
    key: 'longitude',
    label: 'Longitud',
    type: 'string',
    placeholder: '90°',
    onLine: true,
  },
  {
    key: 'altitude',
    label: 'Altitud',
    type: 'string',
    placeholder: '850 m',
  },
];
@Component({
  selector: 'app-personal-info',
  templateUrl: './personal-info.page.html',
  styleUrls: ['./personal-info.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class PersonalInfoPage implements OnInit {
  userPersonalForm!: FormGroup;
  userLocationForm!: FormGroup;
  fieldsPersonal = userPersonalFields;
  fieldsLocation = userLocationFields;
  isEditable = false;
  name = '';
  lastName = '';
  phone = '';
  isRanking = false;
  isSeed = false;
  seed = 0;
  seedIcon = '';
  modals: Record<string, boolean> = {
    modal_Delete: false,
    modal_Delete_2: false,
  };
  isInputValid = false;
  deleteConfirmationInput = '';
  /**
   * @param {Router} router - Angular Router instance for navigation.
   * @param {FormBuilder} fb - FormBuilder instance for form creation.
   * @param {AlertController} alertController - AlertController instance for handling alerts.
   * @param {SessionService} session - Service to manage session-related tasks.
   * @param {ChangeDetectorRef} cdr - ChangeDetectorRef for manually triggering Angular's change detection.
   */
  constructor(
    private router: Router,
    private fb: FormBuilder,
    private alertController: AlertController,
    private session: SessionService,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Angular lifecycle hook that initializes the component and its forms.
   */
  async ngOnInit(): Promise<void> {
    // Initialize both forms as empty
    this.userPersonalForm = this.createEmptyForm(this.fieldsPersonal);
    this.userLocationForm = this.createEmptyForm(this.fieldsLocation);

    // Populate forms with user data
    await this.updateFormsWithUserData();
  }

  /**
   * Creates an empty form based on the provided fields.
   * @param {Array} fields - List of fields to create form controls.
   * @returns {FormGroup} - The generated empty form.
   */
  createEmptyForm(fields: FieldsPersonalInfo[]): FormGroup {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formControls: Record<string, any> = {};

    fields.forEach((field) => {
      formControls[field.key] = [
        { value: '', disabled: !!field.disabled },
        Validators.required,
      ];
    });

    return this.fb.group(formControls);
  }

  /**
   * Populates the forms with data retrieved from the session.
   * @returns {Promise<void>}
   */
  async updateFormsWithUserData(): Promise<void> {
    const dataUser = await this.session.getInfo();
    // Update personal form with user data
    this.userPersonalForm.patchValue({
      userName: dataUser.name || '',
      userLastName: dataUser.lastName || '',
      userPhoneNumber: dataUser.phone || '',
    });

    // Update location form with user location data
    this.userLocationForm.patchValue({});

    console.log('Personal Form Data:', this.userPersonalForm.value);
    console.log('Location Form Data:', this.userLocationForm.value);
  }

  /**
   * Handles form submission and ensures both forms are valid.
   * @returns {Promise<void>}
   */
  async onSubmit(): Promise<void> {
    this.cdr.detectChanges();
    if (this.userPersonalForm.valid && this.userLocationForm.valid) {
      // Process the data if both forms are valid
      console.log('Personal Form:', this.userPersonalForm.value);
      console.log('Location Form:', this.userLocationForm.value);
    } else {
      // Show an alert if any form is invalid
      await this.showAlert();
    }
  }

  /**
   * Displays an alert when a form is invalid.
   * @returns {Promise<void>}
   */
  async showAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Error',
      message: 'Para guadar todos los datos deben ser completados.',
      buttons: ['OK'],
    });

    await alert.present();
  }

  /**
   * Toggles the edit mode for the forms.
   */
  toggleEdit(): void {
    this.isEditable = !this.isEditable;

    if (this.isEditable) {
      setTimeout(() => {
        const firstEditableInput = document.querySelector(
          'ion-input:not([readonly]) input',
        ) as HTMLInputElement | null;
        if (firstEditableInput) {
          firstEditableInput.focus();
          this.cdr.detectChanges();
        }
      }, 100);
    } else {
      void this.onSubmit();
      this.userPersonalForm.markAsPristine();
      this.userLocationForm.markAsPristine();
      this.cdr.detectChanges();
    }
  }

  /**
   * Manejar foco de un campo
   * @param {IonInputCustomEvent<FocusEvent>} event - Evento de foco de Ionic
   */
  handleFocus(event: IonInputCustomEvent<FocusEvent>): void {
    const parentItem = (event.target as HTMLElement).closest('ion-item');
    if (parentItem) {
      parentItem.classList.add('focused');
      this.cdr.detectChanges();
    }
  }

  /**
   * Manejar desenfoque de un campo
   * @param {IonInputCustomEvent<FocusEvent>} event - Evento de desenfoque de Ionic
   */
  handleBlur(event: IonInputCustomEvent<FocusEvent>): void {
    const parentItem = (event.target as HTMLElement).closest('ion-item');
    if (parentItem) {
      parentItem.classList.remove('focused');
      this.cdr.detectChanges();
    }
  }

  /**
   * Limpia todos los focos
   */
  clearFocus(): void {
    const items = document.querySelectorAll('ion-item');
    items.forEach((item) => item.classList.remove('focused'));
    this.cdr.detectChanges();
  }

  /**
   * validate the entry is correct
   * @returns {void}
   */
  validateInput(): void {
    this.isInputValid = this.deleteConfirmationInput === 'ELIMINAR CUENTA';
    this.cdr.detectChanges();
  }

  /**
   * Sends a request to delete the user's account.
   * @returns {void}
   */
  goDeleteAccount(): void {
    if (this.isInputValid) {
      console.log('Cuenta eliminada');
      this.cdr.detectChanges();
      // Aquí puedes agregar tu lógica para eliminar la cuenta
    }
  }

  /**
   * Navigates back to the specified URL.
   * @param {string} url - URL to navigate back to.
   */
  goBack(url: string): void {
    void this.router.navigate([url]);
  }

  /**
   * Opens a modal by its key.
   * @param {string} modalKey - Key of the modal to open.
   */
  openModal(modalKey: string): void {
    this.modals[modalKey] = true;
    this.cdr.detectChanges();
  }

  /**
   * Dismisses a modal by its key.
   * @param {string} modalKey - Key of the modal to dismiss.
   */
  onModalDismiss(modalKey: string): void {
    this.modals[modalKey] = false;
    this.cdr.detectChanges();
  }

  /**
   * Closes one modal and opens another.
   * @param {string} currentModalKey - Key of the modal to close.
   * @param {string} nextModalKey - Key of the modal to open.
   */
  onCloseAndOpen(currentModalKey: string, nextModalKey: string): void {
    this.modals[currentModalKey] = false;

    setTimeout(() => {
      this.modals[nextModalKey] = true;
      this.cdr.detectChanges();
    }, 300);
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  /**
   * Retrieves a field configuration object by its key.
   * @param {string} key - The unique key of the field to retrieve.
   * @returns {FieldsPersonalInfo} The field object matching the provided key, or an empty object if not found.
   */
  getField(key: string): any {
    return this.fieldsLocation.find((field) => field.key === key) || {};
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
