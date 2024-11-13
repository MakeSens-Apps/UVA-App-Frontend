import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IonButton, IonInput, IonLabel } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router } from '@angular/router';
import { SetupService } from '@app/core/services/view/setup/setup.service';
import { Session } from 'src/models/session.model';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { ConfigModel } from 'src/models/configuration/config.model';
import { SetupRacimoService } from '@app/core/services/view/setup/setup-racimo.service';
@Component({
  selector: 'app-register-project-form',
  templateUrl: './register-project-form.page.html',
  styleUrls: ['./register-project-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ExploreContainerComponent,
    IonLabel,
    IonInput,
    IonButton,
    ReactiveFormsModule,
  ],
})
export class RegisterProjectFormPage implements OnInit {
  icon = '../../../../../assets/images/LogoNaturaColombia.svg';
  form: FormGroup;
  user: Session | null = null;
  configModel: ConfigModel | null = null;

  /**
   * Crea una instancia de RegisterProjectFormPage.
   * @param {FormBuilder} formBuilder - El servicio para construir formularios reactivos.
   * @param {Router} router - El servicio de enrutamiento para navegar entre páginas.
   * @param {SetupService} service - El servicio que gestiona la lógica de configuración de usuario.
   * @param {SetupRacimoService} serviceRacimo - El servicio que gestiona la lógica de configuración de usuario.
   * @param {ConfigurationAppService}  configuration El servicio para cargar la configuracion de la app
   */
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private service: SetupService,
    private serviceRacimo: SetupRacimoService,
    private configuration: ConfigurationAppService,
  ) {
    this.form = this.formBuilder.group({});
  }

  /**
   * @memberof RegisterProjectFormPage
   * @returns {Promise<void>} - No retorna ningún valor.
   */
  async ngOnInit(): Promise<void> {
    this.user = await this.service.getParametersUser();
    this.configModel = await this.configuration.getConfigurationApp();
    if (this.configModel) {
      this.buildForm();
      const img = await this.configuration.loadImage(
        this.configModel.branding.logo,
      );
      if (img) {
        this.icon = img;
      }
    }
  }
  /**
   * Builds a form dynamically by adding controls based on the fields defined in the `configModel`.
   * @returns {void}
   * @description Iterates over each field in `configModel.fieldsUVA` and, if the field exists,
   * adds a control to the form with the field's ID. Each control includes validators for required status and minimum length.
   */
  buildForm(): void {
    if (this.configModel) {
      Object.keys(this.configModel.fieldsUVA).forEach((key) => {
        const field = this.configModel?.fieldsUVA[key];
        if (field) {
          this.form.addControl(
            field.fieldId,
            new FormControl('', [Validators.required, Validators.minLength(4)]),
          );
        }
      });
    }
  }
  /**
   * Obtiene los parámetros del usuario y navega a la página de registro completado.
   * @returns {Promise<void>} - Retorna una promesa que se resuelve al completar la navegación.
   */
  async goToCompleted(): Promise<void> {
    this.user = await this.service.getParametersUser();
    const formValues = this.form.value;
    const newUVAResponse = await this.serviceRacimo.createNewUVA();
    const updateUVAResponse = await this.serviceRacimo.updateUVA(
      JSON.stringify(formValues),
    );

    if (newUVAResponse && updateUVAResponse) {
      await this.router.navigate(['register', 'register-completed']);
    } else {
      await this.router.navigate(['register', 'register-project-form']);
    }
  }

  /**
   * Maneja los errores de entrada en el formulario, añadiendo o quitando la clase de error según la validez del control.
   * @param {Event} $event - El evento que se dispara al interactuar con el campo de entrada.
   * @param {string} formName - El nombre del control del formulario para validar.
   * @returns {void} - No retorna ningún valor.
   */
  setErrorInput($event: Event, formName: string): void {
    if (this.form.controls[formName].invalid) {
      ($event.target as HTMLInputElement).classList.add('border_error');
    } else {
      ($event.target as HTMLInputElement).classList.remove('border_error');
    }
  }
}
