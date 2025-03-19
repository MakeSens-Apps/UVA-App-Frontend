import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { IonImg } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register-completed',
  templateUrl: './register-completed.page.html',
  styleUrls: ['./register-completed.page.scss'],
  standalone: true,
  imports: [IonImg, ExploreContainerComponent],
})
export class RegisterCompletedPage implements OnInit, OnDestroy {
  icon = '../../../../../assets/images/LogoNaturaColombia.svg';
  private backButtonSubscription!: Subscription;
  /**
   * Crea una instancia de RegisterCompletedPage.
   * @param {Router} router - El servicio de enrutamiento para navegar entre páginas.
   * @memberof RegisterCompletedPage
   *@param {ChangeDetectorRef} cdr Angular detecte change in app.
   */
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Método del ciclo de vida de Angular que se ejecuta al inicializar el componente.
   * Redirige automáticamente al usuario a la pestaña principal después de 3 segundos.
   * @memberof RegisterCompletedPage
   * @returns {void} - No retorna ningún valor.
   */
  ngOnInit(): void {
    setTimeout(() => {
      void this.router.navigate(['app/tabs/home']);
    }, 3 * 1000);
  }

  /**
   * Cleans up the back button subscription when the component is destroyed.
   * This prevents memory leaks and ensures no further events are handled for this subscription.
   * @returns {void}
   */
  ngOnDestroy(): void {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }
}
