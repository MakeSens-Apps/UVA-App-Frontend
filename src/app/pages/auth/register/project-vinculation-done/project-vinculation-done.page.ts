import { Component, OnInit } from '@angular/core';
import { IonImg } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router } from '@angular/router';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
@Component({
  selector: 'app-project-vinculation-done',
  templateUrl: './project-vinculation-done.page.html',
  styleUrls: ['./project-vinculation-done.page.scss'],
  standalone: true,
  imports: [IonImg, ExploreContainerComponent],
})
export class ProjectVinculationDonePage implements OnInit {
  icon = '../../../../../assets/images/LogoNaturaColombia.svg';
  racimoCode: string | undefined;
  /**
   * Crea una instancia de ProjectVinculationDonePage.
   * @param {Router} router - El servicio de enrutamiento para navegar entre páginas.
   * @param {ConfigurationAppService} configuration sericio para manejar los archivos de configuracion
   * @memberof ProjectVinculationDonePage
   */
  constructor(
    private router: Router,
    private configuration: ConfigurationAppService,
  ) {}

  /**
   * Método del ciclo de vida que se ejecuta al inicializar la página.
   * Establece un temporizador para redirigir a la página de formulario de registro de proyecto después de 3 segundos.
   * @memberof ProjectVinculationDonePage
   * @returns {void} - No retorna ningún valor.
   */
  async ngOnInit(): Promise<void> {
    const config = await this.configuration.getConfigurationApp();
    if (config) {
      this.racimoCode = config.racimo.linkageCode;
      const img = await this.configuration.loadImage(config.branding.logo);
      if (img) {
        this.icon = img;
      }
    }

    setTimeout(() => {
      void this.router.navigate(['register/register-project-form']);
    }, 3 * 1000);
  }
}
