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

  constructor(private modalCtrl: ModalController) {}

  // Cierra el modal
  dismiss(button: string): Promise<boolean> {
    return this.modalCtrl.dismiss({ action: button });
  }

  // Ejecuta la acción del botón
  actionButton(button: string): Promise<Boolean> {
    // Emitir el rol del botón (puedes usar "aceptar", "cancelar", etc.)
    return this.dismiss(button); // Cerrar el modal después de la acción
  }
}
