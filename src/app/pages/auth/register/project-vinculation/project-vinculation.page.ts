import { Component, OnInit } from '@angular/core';
import { IonButton, IonInput, IonLabel } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SetupService } from '@app/core/services/view/setup/setup.service';
import { Session } from 'src/models/session.model';
@Component({
  selector: 'app-project-vinculation',
  templateUrl: './project-vinculation.page.html',
  styleUrls: ['./project-vinculation.page.scss'],
  standalone: true,
  imports: [
    ExploreContainerComponent,
    IonLabel,
    IonInput,
    IonButton,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class ProjectVinculationPage implements OnInit {
  showError = false;
  form: FormGroup;
  user: Session | null = null;

  /**
   * Crea una instancia de ProjectVinculationPage.
   * @param {FormBuilder} formBuilder - Servicio para construir formularios reactivos.
   * @param {Router} router - Servicio de enrutamiento para navegar entre páginas.
   * @param {SetupService} service - Servicio para gestionar la configuración del usuario.
   * @memberof ProjectVinculationPage
   */
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private service: SetupService,
  ) {
    this.form = this.formBuilder.group({
      code: new FormControl(
        '',
        Validators.compose([
          Validators.required,
          Validators.maxLength(6),
          Validators.minLength(6),
        ]),
      ),
    });
  }

  /**
   * Método del ciclo de vida que se ejecuta al inicializar la página.
   * Obtiene los parámetros del usuario al iniciar.
   * @memberof ProjectVinculationPage
   * @returns {Promise<void>} - Promesa que no retorna ningún valor.
   */
  async ngOnInit(): Promise<void> {
    this.user = await this.service.getParametersUser();
  }

  /**
   * Método para validar el código ingresado y navegar a la página de validación del proyecto.
   * Si el código es '000000', se muestra un mensaje de error en lugar de navegar.
   * @memberof ProjectVinculationPage
   * @returns {void} - No retorna ningún valor.
   */
  goToValidateProject(): void {
    if (this.form.value.code == '000000') {
      this.showError = true;
      return;
    }
    void this.router.navigate(['register/validate-project']);
  }
}
