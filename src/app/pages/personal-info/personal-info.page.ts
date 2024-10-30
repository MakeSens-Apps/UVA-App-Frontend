import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';

// Definición de los campos de usuario
const userFields = [
  { key: 'userName', label: 'Nombres', type: 'string', placeholder: '[Nombres del monitor]' },
  { key: 'userLastName', label: 'Apellidos', type: 'string', placeholder: '[Apellidos del monitor]' },
  { key: 'userPhoneNumber', label: 'Teléfono', type: 'string', placeholder: '3183766489' },
  { key: 'userEmail', label: 'Email', type: 'string', placeholder: 'Correo@example.com' },
  { key: 'latitude', label: 'Latitud', type: 'string', placeholder: '70 55’ 30”' },
  { key: 'longitude', label: 'Longitud', type: 'string', placeholder: '90°' },
  { key: 'altitude', label: 'Altitud', type: 'string', placeholder: '850 m' },
];

@Component({
  selector: 'app-personal-info',
  templateUrl: './personal-info.page.html',
  styleUrls: ['./personal-info.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule, 
    FormsModule,
    ReactiveFormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PersonalInfoPage implements OnInit {
  userForm!: FormGroup; 
  fields = userFields;
  modals = {
    modal_Delete: false,
  }
  
  constructor(
    private router: Router,
    private fb: FormBuilder,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.initializeForm();
  }

  initializeForm() {
    const formControls: { [key: string]: any } = {}; // Definir tipo explícito
    this.fields.forEach(field => {
      formControls[field.key] = ['', Validators.required];
    });
    this.userForm = this.fb.group(formControls);
  }

  async onSubmit() {
    if (this.userForm.valid) {
      console.log('Formulario enviado', this.userForm.value);
      // Aquí puedes enviar los datos a tu endpoint
    } else {
      console.log('Formulario inválido');
      await this.showAlert(); // Llamar a la función que muestra la alerta
    }
  }

  async showAlert() {
    const alert = await this.alertController.create({
      header: 'Error',
      message: 'Por favor, complete todos los campos obligatorios.',
      buttons: ['OK']
    });

    await alert.present();
  }

  goBack(url: string) {
    this.router.navigate([url]);   
  }

  goDeleteAcount() {
       // Aquí puedes enviar los datos a tu endpoint para elimira cuenta
  }


}
