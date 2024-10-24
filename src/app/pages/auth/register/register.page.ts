import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonLabel,
  IonInput,
  IonButton,
  IonRouterOutlet,
} from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router, RouterOutlet } from '@angular/router';
import { SetupService } from '@app/core/services/view/setup/setup.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    IonRouterOutlet,
    CommonModule,
    FormsModule,
    ExploreContainerComponent,
    IonLabel,
    IonInput,
    IonButton,
    ReactiveFormsModule,
    RouterOutlet,
  ],
})
export class RegisterPage {
  form: FormGroup;

  /**
   * Crea una instancia de RegisterPage.
   * @param {FormBuilder} formBuilder - El servicio para construir formularios reactivos.
   * @param {Router} router - El servicio de enrutamiento para navegar entre páginas.
   * @param {SetupService} service - El servicio que gestiona la lógica de configuración de usuario.
   * @memberof RegisterPage
   */
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private service: SetupService,
  ) {
    this.form = this.formBuilder.group({
      name: new FormControl('', [Validators.required, Validators.minLength(3)]),
      lastName: new FormControl('', [
        Validators.required,
        Validators.minLength(3),
      ]),
    });
  }

  /**
   * Guarda los parámetros del usuario y navega a la página de configuración de número de teléfono.
   * @memberof RegisterPage
   * @returns {Promise<boolean>} - Retorna una promesa que se resuelve a true si la navegación es exitosa.
   */
  async goToSetNumber(): Promise<boolean> {
    await this.service.setParametersUser(
      this.form.value.name,
      this.form.value.lastName,
    );
    return this.router.navigate(['register', 'set-phone-register']);
  }

  /**
   * Maneja los errores de entrada en el formulario, añadiendo o quitando la clase de error según la validez del control.
   * @param {Event} $event - El evento que se dispara al interactuar con el campo de entrada.
   * @param {string} formName - El nombre del control del formulario para validar.
   * @memberof RegisterPage
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
