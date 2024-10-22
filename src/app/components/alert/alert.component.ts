import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';

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
  @Input() content: string = ''; // Contenido HTML dinámico del modal
  @Input() ShowCancelButton: boolean = true;
  @Input() textCancelButton: string = '';
  @Input() textOkButton: string = '';

  // @Output() ButtonSelected = new EventEmitter<string>();     // Para emitir qué botón fue seleccionado

  constructor(private modalCtrl: ModalController) {}

  // Cierra el modal
  dismiss(button: string) {
    this.modalCtrl.dismiss({ action: button });
  }

  // Ejecuta la acción del botón
  actionButton(button: any) {
    // Emitir el rol del botón (puedes usar "aceptar", "cancelar", etc.)
    this.dismiss(button); // Cerrar el modal después de la acción
  }
}
