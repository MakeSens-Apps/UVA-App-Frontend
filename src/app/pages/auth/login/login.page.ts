import { Component } from '@angular/core';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { IonButton, IonInput, IonLabel, ModalController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlertComponent } from '@app/components/alert/alert.component';
import { SetupService } from '@app/core/services/view/setup/setup.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [ExploreContainerComponent,IonLabel,IonInput, IonButton,ReactiveFormsModule,FormsModule]
})
export class LoginPage  {
  form:FormGroup;
  constructor(private router : Router,private formBuilder : FormBuilder, private modalCtrl: ModalController, private service:SetupService) {
    this.form = this.formBuilder.group({
      phone: new FormControl('', Validators.compose([Validators.required, Validators.maxLength(10), Validators.minLength(10)])),
    });
   }


  goToRegister(){
    this.router.navigate(['pre-register'])
  }

  goToOtp(){  
    this.abrirModal();
  }

  async abrirModal() {
    const modal = await this.modalCtrl.create({
      component: AlertComponent,
      componentProps: {
        content: `<p> ¿Es correcto este número de teléfono: <strong> ${this.form.controls['phone'].value} </strong>? </p>`,
        textCancelButton : 'No, editar',
        textOkButton : 'Sí, continuar'
        
      },
      cssClass: 'custom-modal',
      backdropDismiss: false 
    });

    // Recibir la respuesta del modal
    modal.onDidDismiss().then(async (data) => {
      if (data.data.action === 'OK') {
         // FIXME: remove validation
        const response = await this.service.signIn(this.form.controls['phone'].value);
        if (response.error.name == "UserNotFoundException") {
          this.openModalNoRegister();
          return
        }
        this.router.navigate(['otp/login',this.form.controls['phone'].value])
      } 
    });
    
    await modal.present();
    
  }

  async openModalNoRegister(){
    const modal = await this.modalCtrl.create({
      component: AlertComponent,
      componentProps: {
        content: `<p> El número <strong> ${this.form.controls['phone'].value} </strong> no se encuentra registrado.
        </p>
        <h3>¿Quieres registrarte?</h3>
          `,
        textCancelButton : 'No',
        textOkButton : 'Sí, registrame'
        
      },
      cssClass: 'custom-modal',
      backdropDismiss: false 
    });

    // Recibir la respuesta del modal
    modal.onDidDismiss().then((data) => {
      if (data.data.action === 'OK') {
        this.goToRegister();
      
      } 
    });
    
    await modal.present();

  }

}
