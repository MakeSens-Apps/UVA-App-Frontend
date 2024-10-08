import { Component, OnInit } from '@angular/core';
import { IonButton, IonInput, IonLabel } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Preferences } from '@capacitor/preferences';
import { USER_KEY } from '../register.page';

@Component({
  selector: 'app-project-vinculation',
  templateUrl: './project-vinculation.page.html',
  styleUrls: ['./project-vinculation.page.scss'],
  standalone: true,
  imports: [ExploreContainerComponent, IonLabel, IonInput, IonButton,CommonModule,FormsModule, ReactiveFormsModule,RouterLink]
})
export class ProjectVinculationPage implements OnInit {
  showError :boolean = false;
  form:FormGroup;
  user : any
  constructor(private formBuilder : FormBuilder, private router : Router) { 
    this.form = this.formBuilder.group({
      code: new FormControl('', Validators.compose([Validators.required, Validators.maxLength(6), Validators.minLength(6)])),
    });
  }


  async ngOnInit() {
    const ret = await Preferences.get({ key: USER_KEY });
     this.user = JSON.parse(ret.value ? ret.value : '');
  }

  goToValidateProject(){
    if (this.form.value.code == '000000') {
      console.log("🚀 ~ ProjectVinculationPage ~ goToValidateProject ~ this.form.value:", this.form.value)
      this.showError = true;
      return
    }
    this.router.navigate(['register/validate-project'])
  }
}
