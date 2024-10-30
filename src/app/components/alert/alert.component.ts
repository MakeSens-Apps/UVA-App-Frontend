import { Component, Input, ViewEncapsulation } from '@angular/core';

import {
  IonButton,
  ModalController,
  IonContent,
  IonCard,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.component.html',
  styleUrls: ['./alert.component.scss'],
  imports: [IonCard, IonContent, IonButton],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
})
export class AlertComponent {
  @Input() content = ''; // Contenido HTML dinámico del modal
  @Input() ShowCancelButton = true;
  @Input() textCancelButton = '';
  @Input() textOkButton = '';

  /**
   * Crea una instancia de AlertComponent.
   * @param {ModalController} modalCtrl Controlador para manejar el modal.
   * @memberof AlertComponent
   */
  constructor(private modalCtrl: ModalController) {}

  /**
   * Cierra el modal y envía la acción del botón.
   * @param {string} button El rol del botón que fue presionado (ej. "aceptar" o "cancelar").
   * @returns {Promise<boolean>} Una promesa que se resuelve en `true` si el modal se cerró correctamente.
   * @memberof AlertComponent
   */
  dismiss(button: string): Promise<boolean> {
    return this.modalCtrl.dismiss({ action: button });
  }

  /**
   * Ejecuta la acción asociada con el botón presionado.
   * @param {string} button El rol del botón que fue presionado (ej. "aceptar", "cancelar", etc.).
   * @returns {Promise<boolean>} Una promesa que se resuelve en `true` o `false` dependiendo de la acción.
   * @memberof AlertComponent
   */
  actionButton(button: string): Promise<boolean> {
    return this.dismiss(button);
  }
}
