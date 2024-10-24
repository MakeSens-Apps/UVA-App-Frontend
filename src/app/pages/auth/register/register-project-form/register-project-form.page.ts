import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { IonButton, IonInput, IonLabel } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router } from '@angular/router';
import { SetupService } from '@app/core/services/view/setup/setup.service';
import { Session } from 'src/models/session.model';
@Component({
  selector: 'app-register-project-form',
  templateUrl: './register-project-form.page.html',
  styleUrls: ['./register-project-form.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ExploreContainerComponent,
    IonLabel,
    IonInput,
    IonButton,
    ReactiveFormsModule,
  ],
})
export class RegisterProjectFormPage {
  icon = '../../../../../assets/images/LogoNaturaColombia.svg';
  form: FormGroup;
  user: Session | null = null;
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private service: SetupService,
  ) {
    this.form = this.formBuilder.group({
      nameFarm: new FormControl('', [
        Validators.required,
        Validators.minLength(4),
      ]),
      nameLane: new FormControl('', [
        Validators.required,
        Validators.minLength(4),
      ]),
      nameMunicipality: new FormControl('', [
        Validators.required,
        Validators.minLength(4),
      ]),
    });
  }

  async goToCompleted(): Promise<void> {
    this.user = await this.service.getParametersUser();
    await this.router.navigate(['register', 'register-completed']);
  }

  setErrorInput($event: Event, formName: string): void {
    if (this.form.controls[formName].invalid) {
      ($event.target as HTMLInputElement).classList.add('border_error');
    } else {
      ($event.target as HTMLInputElement).classList.remove('border_error');
    }
  }
}
