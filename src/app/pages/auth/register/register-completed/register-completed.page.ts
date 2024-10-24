import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { IonImg } from '@ionic/angular/standalone';

@Component({
  selector: 'app-register-completed',
  templateUrl: './register-completed.page.html',
  styleUrls: ['./register-completed.page.scss'],
  standalone: true,
  imports: [IonImg, ExploreContainerComponent],
})
export class RegisterCompletedPage implements OnInit {
  icon = '../../../../../assets/images/LogoNaturaColombia.svg';

  /**
   * Crea una instancia de RegisterCompletedPage.
   * @param {Router} router - El servicio de enrutamiento para navegar entre páginas.
   * @memberof RegisterCompletedPage
   */
  constructor(private router: Router) {}

  /**
   * Método del ciclo de vida de Angular que se ejecuta al inicializar el componente.
   * Redirige automáticamente al usuario a la pestaña principal después de 3 segundos.
   * @memberof RegisterCompletedPage
   * @returns {void} - No retorna ningún valor.
   */
  ngOnInit(): void {
    setTimeout(() => {
      void this.router.navigate(['app/tabs/tab2']);
    }, 3 * 1000);
  }
}
