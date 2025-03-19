import { Component, OnInit } from '@angular/core';
import {
  IonButton,
  IonInput,
  IonLabel,
  ModalController,
} from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormBuilder,
  FormControl,
  Validators,
} from '@angular/forms';
import { AlertComponent } from '@app/components/alert/alert.component';
import { SetupService } from '@app/core/services/view/setup/setup.service';
import { Session } from 'src/models/session.model';
@Component({
  selector: 'app-set-phone-register',
  templateUrl: './set-phone-register.page.html',
  styleUrls: ['./set-phone-register.page.scss'],
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
export class SetPhoneRegisterPage implements OnInit {
  form: FormGroup;
  user: Session | null = null;

  /**
   * Crea una instancia de SetPhoneRegisterPage.
   * @param {Router} router - El servicio de enrutamiento para navegar entre páginas.
   * @param {FormBuilder} formBuilder - El servicio para construir formularios reactivos.
   * @param {ModalController} modalCtrl - El servicio para crear y gestionar modales.
   * @param {SetupService} service - El servicio que gestiona la lógica de configuración de usuario.
   * @memberof SetPhoneRegisterPage
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
  }

  /**
   * Método del ciclo de vida que se ejecuta al inicializar el componente.
   * Obtiene los parámetros del usuario a través del servicio.
   * @memberof SetPhoneRegisterPage
   * @returns {Promise<void>} - No retorna ningún valor.
   */
  async ngOnInit(): Promise<void> {
    this.user = await this.service.getParametersUser();
  }

  /**
   * Navega a la pantalla de OTP (One-Time Password).
   * @memberof SetPhoneRegisterPage
   * @returns {void} - No retorna ningún valor.
   */
  goToOtp(): void {
    void this.abrirModal();
  }

  /**
   * Abre un modal para confirmar el número de teléfono ingresado.
   * Si el usuario confirma, se registra el número de teléfono y se navega a la página de OTP.
   * @memberof SetPhoneRegisterPage
   * @returns {Promise<void>} - No retorna ningún valor.
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
          const response = await this.service.signUp(
            '+57' + this.form.controls['phone'].value,
          );
          if (response) {
            await this.router.navigate([
              'otp/register',
              this.form.controls['phone'].value,
            ]);
          } else {
            //FIXME: Deberia abrir una ventana emergente con "El numero {####} ya esta registrado"
            console.error('El numero ya esta registrado');
          }
        }
      })
      .catch((err) => {
        console.error(err);
      });

    await modal.present();
  }
}
