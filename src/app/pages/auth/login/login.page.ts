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
export class LoginPage {
  form: FormGroup;
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

  goToHome(): Promise<boolean> {
    return this.router.navigate(['home']);
  }
  goToRegister(): Promise<boolean> {
    return this.router.navigate(['pre-register']);
  }

  goToOtp(): void {
    void this.abrirModal();
  }

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
