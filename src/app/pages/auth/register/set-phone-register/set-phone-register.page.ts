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
  user: any;
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

  async ngOnInit() {
    this.user = await this.service.getParametersUser();
    console.log(
      '🚀 ~ SetPhoneRegisterPage ~ modal.onDidDismiss ~ this.user:',
      this.user,
    );
  }
  goToOtp() {
    this.abrirModal();
  }

  async abrirModal() {
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
    modal.onDidDismiss().then(async (data) => {
      if (data.data.action === 'OK') {
        const response = this.service.signUp(
          '+57' + this.form.controls['phone'].value,
        );
        console.log(response);
        this.router.navigate([
          'otp/register',
          this.form.controls['phone'].value,
        ]);
      }
    });

    await modal.present();
  }
}
