import { ChangeDetectorRef,Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { IonImg } from '@ionic/angular/standalone';
import { AppMinimizeService } from '@app/core/services/minimize/app-minimize.service'; 

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
   *@param {ChangeDetectorRef} ChangeDetectorRef Angular detecte change in app.
   * @param {AppMinimizeService} minimizeService - The AppMinimizeService.
   */
  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private minimizeService: AppMinimizeService,
  ) {}

  /**
   * Método del ciclo de vida de Angular que se ejecuta al inicializar el componente.
   * Redirige automáticamente al usuario a la pestaña principal después de 3 segundos.
   * @memberof RegisterCompletedPage
   * @returns {void} - No retorna ningún valor.
   */
  ngOnInit(): void {
    this.minimizeService.initializeBackButtonHandler()
    
    
    setTimeout(() => {
      void this.router.navigate(['app/tabs/home']);
    }, 3 * 1000);
  }
}
