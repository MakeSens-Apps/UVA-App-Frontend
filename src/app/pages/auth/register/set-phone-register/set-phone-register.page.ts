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

  async ngOnInit(): Promise<void> {
    this.user = await this.service.getParametersUser();
    console.log(
      '🚀 ~ SetPhoneRegisterPage ~ modal.onDidDismiss ~ this.user:',
      this.user,
    );
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
