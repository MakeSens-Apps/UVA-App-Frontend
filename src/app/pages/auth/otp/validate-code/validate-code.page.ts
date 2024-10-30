import { Component, OnInit } from '@angular/core';
import { IonImg } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-validate-code',
  templateUrl: './validate-code.page.html',
  styleUrls: ['./validate-code.page.scss'],
  standalone: true,
  imports: [IonImg, ExploreContainerComponent],
})
export class ValidateCodePage implements OnInit {
  loader = '../../../../../assets/images/loader.gif';
  type;
  /**
   * Crea una instancia de ValidateCodePage.
   * @param {Router} router - El servicio de enrutamiento para navegar entre páginas.
   * @param {ActivatedRoute} route - El servicio que contiene información sobre la ruta activa.
   * @memberof ValidateCodePage
   */
  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.type = this.route.snapshot.paramMap.get('type');
  }

  /**
   * Inicia temporizador para redirigir en función de si es inicio de sesión o registro.
   * @memberof ValidateCodePage
   * @returns {void} - No retorna ningún valor.
   */
  ngOnInit(): void {
    setTimeout(() => {
      if (this.type == 'login') {
        void this.router.navigate(['app/tabs/home']);
      } else if (this.type == 'register') {
        console.log('🚀 ~ ValidateCodePage ~ setTimeout ~ type: is Register');

        void this.router.navigate(['register/project-vinculation']);
      }
    }, 2 * 1000);
  }
}
