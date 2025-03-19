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
} from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { IonInputCustomEvent } from '@ionic/core';
import { UserDSService } from '@app/core/services/storage/datastore/user-ds.service';
import { UvaDSService } from '@app/core/services/storage/datastore/uva-ds.service';
import { AuthService } from '@app/core/services/auth/auth.service';

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
   * @param {ChangeDetectorRef} cdr - ChangeDetectorRef for manually triggering Angular's change detection.
   * @param {AuthService} auth AuthService
   */
  constructor(
    private router: Router,
    private fb: FormBuilder,
    private alertController: AlertController,
    private cdr: ChangeDetectorRef,
    private auth: AuthService,
  ) {}

  /**
   * Angular lifecycle hook that initializes the component and its forms.
   */
  async ngOnInit(): Promise<void> {
    // Initialize both forms as empty
    this.userPersonalForm = this.createEmptyForm(this.fieldsPersonal);
    this.userLocationForm = this.createEmptyForm(this.fieldsLocation);
  }

  /**
   * view about to enter
   */
  ionViewWillEnter(): void {
    // Populate forms with user data
    void this.updateFormsWithUserData();
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
      formControls[field.key] = [{ value: '', disabled: !!field.disabled }];
    });

    return this.fb.group(formControls);
  }

  /**
   * Populates the forms with data retrieved from the session.
   * @returns {Promise<void>}
   */
  async updateFormsWithUserData(): Promise<void> {
    const user = await UserDSService.getUser();
    const uva = await UvaDSService.getUVAByID();
    // Update personal form with user data
    this.userPersonalForm.patchValue({
      userName: user?.Name || '',
      userLastName: user?.LastName || '',
      userPhoneNumber: user?.PhoneNumber || '',
      userEmail: user?.Email || undefined,
    });

    this.userLocationForm.patchValue({
      latitude: uva?.latitude ?? '',
      longitude: uva?.longitude ?? '',
      altitude: uva?.altitude ?? '',
    });

    let fields: Record<string, string> = {};

    // Validamos y procesamos el campo uva.fields
    try {
      if (uva?.fields) {
        fields =
          typeof uva.fields === 'string'
            ? JSON.parse(uva.fields)
            : typeof uva.fields === 'object'
              ? (uva.fields as Record<string, string>)
              : (() => {
                  throw new Error('Formato no válido para uva.fields');
                })();
      } else {
        console.warn('uva.fields está vacío o no definido.');
      }
    } catch (error) {
      console.error('Error procesando uva.fields:', error);
    }
    // Update location form with user location data
    this.userLocationForm.patchValue({
      finca: fields['farmName'] ?? '',
      vereda: fields['villageName'] ?? '',
      municipio: fields['townName'] ?? '',
    });
  }

  /**
   * Handles form submission and ensures both forms are valid.
   * @returns {Promise<void>}
   */
  async onSubmit(): Promise<void> {
    this.cdr.detectChanges();
    if (this.userPersonalForm.valid && this.userLocationForm.valid) {
      // Process the data if both forms are valid
      void UserDSService.updateUser({
        name: await this.userPersonalForm.value['userName'],
        lastName: await this.userPersonalForm.value['userLastName'],
        email: await this.userPersonalForm.value['userEmail'],
      });
      // Captura los valores del formulario y estructura los fields
      const fields: Record<string, string> = {
        farmName: this.userLocationForm.value['finca'] ?? '',
        villageName: this.userLocationForm.value['vereda'] ?? '',
        townName: this.userLocationForm.value['municipio'] ?? '',
      };
      const fieldsString = JSON.stringify(fields);

      void UvaDSService.updateUVA({
        latitude: await this.userLocationForm.value['latitude'],
        longitude: await this.userLocationForm.value['longitude'],
        altitud: await this.userLocationForm.value['altitude'],
        fields: fieldsString,
      });
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
  async goDeleteAccount(): Promise<void> {
    if (this.isInputValid) {
      this.cdr.detectChanges();
      const isDeleteUser = await this.auth.handleDeleteUser();
      if (isDeleteUser) {
        this.goBack('/login');
      } else {
        const alert = await this.alertController.create({
          header: 'Error',
          message: 'No se pudo borrar la cuenta',
          buttons: ['OK'],
        });

        await alert.present();
      }
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
