import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonLabel,
  IonInput,
  IonCheckbox,
} from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '@app/explore-container/explore-container.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-pre-register',
  templateUrl: './pre-register.page.html',
  styleUrls: ['./pre-register.page.scss'],
  standalone: true,
  imports: [
    IonInput,
    CommonModule,
    ExploreContainerComponent,
    IonLabel,
    IonButton,
    IonCheckbox,
  ],
})
export class PreRegisterPage {
  enabledButton = false;

  /**
   * Crea una instancia de PreRegisterPage.
   * @param {Router} router - El servicio de enrutamiento para navegar entre páginas.
   * @param {ChangeDetectorRef} ref - El servicio para detectar cambios en la vista.
   * @memberof PreRegisterPage
   */
  constructor(
    private router: Router,
    private ref: ChangeDetectorRef,
  ) {}

  /**
   * Verifica si los términos y condiciones han sido aceptados.
   * Habilita o deshabilita el botón de registro según el estado del checkbox.
   * @param {Event} $event - El evento que se dispara al cambiar el estado del checkbox.
   * @memberof PreRegisterPage
   * @returns {void} - No retorna ningún valor.
   */
  checkTerm($event: Event): void {
    this.enabledButton = ($event.target as HTMLInputElement).checked;
    this.ref.detectChanges();
  }

  /**
   * Navega a la página de registro.
   * @memberof PreRegisterPage
   * @returns {void} - No retorna ningún valor.
   */
  goToRegister(): void {
    void this.router.navigate(['register']);
  }
}
