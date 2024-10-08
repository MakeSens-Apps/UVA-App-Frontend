import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {  IonLabel, IonInput, IonButton, IonRouterOutlet } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router, RouterOutlet } from '@angular/router';
import { Preferences } from '@capacitor/preferences';

export const USER_KEY : string = 'user';
@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonRouterOutlet,  CommonModule, FormsModule, ExploreContainerComponent,IonLabel,IonInput,IonButton,ReactiveFormsModule, RouterOutlet]
})
export class RegisterPage {
  form:FormGroup;
  constructor(private formBuilder : FormBuilder, private router : Router) { 
    this.form = this.formBuilder.group({
      name: new FormControl('', [Validators.required,Validators.minLength(3)]),
      lastName: new FormControl('',[Validators.required,Validators.minLength(3)])
    });

  }



  async goToSetNumber(){
    await Preferences.set({
      key: USER_KEY,
      value: JSON.stringify({...this.form.value})
    });
    this.router.navigate(['register','set-phone-register'])
  }

  setErrorInput($event:any,formName:string){
    if (this.form.controls[formName].invalid) {
      ($event.target as HTMLInputElement).classList.add('border_error');
    }else {
      ($event.target as HTMLInputElement).classList.remove('border_error');
    }
  }
}
