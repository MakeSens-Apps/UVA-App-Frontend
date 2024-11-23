import { Component, OnInit } from '@angular/core';
import { IonButton, IonInput, IonLabel } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { SetupService } from '@app/core/services/view/setup/setup.service';
import { Session } from 'src/models/session.model';
import { SetupRacimoService } from '@app/core/services/view/setup/setup-racimo.service';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { SyncMonitorDSService } from '@app/core/services/storage/datastore/sync-monitor-ds.service';

@Component({
  selector: 'app-project-vinculation',
  templateUrl: './project-vinculation.page.html',
  styleUrls: ['./project-vinculation.page.scss'],
  standalone: true,
  imports: [
    ExploreContainerComponent,
    IonLabel,
    IonInput,
    IonButton,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
  ],
})
export class ProjectVinculationPage implements OnInit {
  showError = false;
  form: FormGroup;
  user: Session | null = null;

  /**
   * Creates an instance of ProjectVinculationPage.
   * @param {FormBuilder} formBuilder - Service for building reactive forms.
   * @param {Router} router - Router service to handle page navigation.
   * @param {SetupService} service - Service to manage user setup.
   * @param {SetupRacimoService} serviceRacimo - Service to manage UVA and RACIMO data.
   * @param {ConfigurationAppService} configuration -Service to manage S3 y FileSystem
   */
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private service: SetupService,
    private serviceRacimo: SetupRacimoService,
    private configuration: ConfigurationAppService,
  ) {
    this.form = this.formBuilder.group({
      code: new FormControl(
        '',
        Validators.compose([
          Validators.required,
          Validators.maxLength(6),
          Validators.minLength(6),
        ]),
      ),
    });
  }

  /**
   * Lifecycle hook that executes when initializing the page.
   * Retrieves the user session parameters on load and redirects if a valid user ID is found.
   * @returns {Promise<void>} - Resolves with no return value.
   */
  async ngOnInit(): Promise<void> {
    this.user = await this.service.getParametersUser();
    if (this.user.userID) {
      const response = await this.serviceRacimo.getUVA(this.user.userID);
      if (response) {
        await SyncMonitorDSService.waitForSyncDataStore(); //Espera a que DataStore este sincronizado
        void this.router.navigate(['app/tabs/home']);
      }
    } else {
      //FIXME: Adicionar evento de error ya que no tiene un ID de usuario
    }
  }

  /**
   * Validates the entered code and navigates to the project validation page.
   * If the code is '000000', displays an error message instead of navigating.
   * @returns {void} - Does not return a value.
   */
  async goToValidateProject(): Promise<void> {
    this.serviceRacimo
      .getRACIMOByCode(this.form.value.code)
      .then((response) => {
        if (response) {
          void this.router.navigate(['register/validate-project']);
        } else {
          this.showError = true;
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }
}
