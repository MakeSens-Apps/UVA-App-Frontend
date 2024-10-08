import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonInput, IonLabel, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { USER_KEY } from '../register.page';

@Component({
  selector: 'app-register-project-form',
  templateUrl: './register-project-form.page.html',
  styleUrls: ['./register-project-form.page.scss'],
  standalone: true,
  imports: [ CommonModule, FormsModule, ExploreContainerComponent,IonLabel,IonInput,IonButton,ReactiveFormsModule]
})
export class RegisterProjectFormPage  {

  icon : string = "../../../../../assets/images/LogoNaturaColombia.svg";
  form:FormGroup;
  user: any;
  constructor(private formBuilder : FormBuilder, private router : Router) { 
    this.form = this.formBuilder.group({
      nameFarm: new FormControl('', [Validators.required, Validators.minLength(4)]),
      nameLane: new FormControl('',[Validators.required, Validators.minLength(4)]),
      nameMunicipality: new FormControl('',[Validators.required, Validators.minLength(4)])
    });
  }

  async goToCompleted(){
    const ret = await Preferences.get({ key: USER_KEY });
    this.user = JSON.parse(ret.value ? ret.value : '');
    await Preferences.set({ 
      key:USER_KEY,
      value: JSON.stringify({...this.user , ...this.form.value})
    });
    this.router.navigate(['register','register-completed'])
  }

  setErrorInput($event:any,formName:string){
    if (this.form.controls[formName].invalid) {
      ($event.target as HTMLInputElement).classList.add('border_error');
    }else {
      ($event.target as HTMLInputElement).classList.remove('border_error');
    }
  }
}
