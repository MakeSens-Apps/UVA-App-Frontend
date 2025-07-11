import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConfigurationAppService } from '@app/core/services/storage/configuration-app.service';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { IonicModule } from '@ionic/angular';
import { SessionService } from '@app/core/services/session/session.service';
import { MoonPhaseService } from '@app/core/services/view/moon/moon-phase.service';
@Component({
  selector: 'app-validate-project',
  templateUrl: './validate-project.page.html',
  styleUrls: ['./validate-project.page.scss'],
  standalone: true,
  imports: [ExploreContainerComponent, IonicModule, RouterLink],
})
export class ValidateProjectPage implements OnInit {
  loader = '../../../../../assets/images/loader.gif';
  timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * Creates an instance of ValidateProjectPage.
   * @param {Router} router The Angular router used for view redirection.
   * @param {ConfigurationAppService} config The service handling application configuration and data download.
   *  @param {SessionService} session The service from session
   *  @param {MoonPhaseService} moonphase The service from moon Phase
   * @memberof ValidateProjectPage
   */
  constructor(
    private router: Router,
    private config: ConfigurationAppService,
    private session: SessionService,
    private moonphase: MoonPhaseService,
  ) {}

  /**
   * Angular lifecycle hook that runs on component initialization.
   * Starts a timer and triggers the download of necessary data.
   * If both the timer and download complete successfully, navigates to the "project-vinculation-done" page.
   * @returns {void}
   * @memberof ValidateProjectPage
   */
  ngOnInit(): void {
    void this.startTimerAndDownload();
  }

  /**
   * Initiates both a timer and a data download operation simultaneously.
   * Navigates to the "project-vinculation-done" page if both operations complete successfully,
   * otherwise navigates to "project-vinculation" if the download fails.
   * @private
   * @async
   * @returns {Promise<void>}
   * @memberof ValidateProjectPage
   */
  private async startTimerAndDownload(): Promise<void> {
    // Inicia el temporizador
    const timerPromise = new Promise<void>((resolve) => {
      this.timer = setTimeout(() => {
        resolve();
      }, 2 * 1000);
    });

    // Inicia ambas operaciones en paralelo
    const downloadSuccessPromise = this.config.downLoadData();
    const downloadMoonPhasesPromise =
      this.moonphase.downloadAndStoreMoonPhaseData();

    // Espera que todas las promesas se resuelvan
    const [downloadSuccess, downloadMoonPhases] = await Promise.all([
      downloadSuccessPromise,
      downloadMoonPhasesPromise,
    ]);
    await timerPromise;

    // Si ambas operaciones de descarga fueron exitosas y el temporizador ha terminado, navega
    if (downloadSuccess && downloadMoonPhases) {
      await this.config.loadBranding();
      void this.router.navigate(['register', 'project-vinculation-done']);
    } else {
      void this.router.navigate(['register', 'project-vinculation']);
    }
  }

  /**
   * Cancels the timer if it is currently running, clearing the timeout.
   * @returns {void}
   * @memberof ValidateProjectPage
   */
  cancelTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
  }
}
